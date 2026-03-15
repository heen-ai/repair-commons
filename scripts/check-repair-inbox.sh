#!/bin/bash
# Check repaircafe@agentmail.to inbox for replies and post them as comments
# Run via cron every hour

set -e

AGENTMAIL_API_KEY="${AGENTMAIL_API_KEY}"
INBOX="repaircafe@agentmail.to"
DB="postgresql://revive:revive_commons_2026@localhost/revive_commons"
PROCESSED_FILE="/tmp/repair-inbox-processed.json"

# Initialize processed file if it doesn't exist
if [ ! -f "$PROCESSED_FILE" ]; then
  echo '[]' > "$PROCESSED_FILE"
fi

# Fetch messages
MESSAGES=$(curl -s -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  "https://api.agentmail.to/v0/inboxes/$INBOX/messages?limit=20")

echo "$MESSAGES" | python3 << 'PYEOF'
import json, sys, os, re, subprocess, requests, uuid

messages_raw = sys.stdin.read()
try:
    data = json.loads(messages_raw)
except:
    print("Failed to parse messages JSON")
    sys.exit(0)

messages = data.get("messages", [])
if not messages:
    print("No messages in inbox")
    sys.exit(0)

# Load processed IDs
processed_file = "/tmp/repair-inbox-processed.json"
try:
    with open(processed_file) as f:
        processed = json.load(f)
except:
    processed = []

db_url = os.environ.get("DATABASE_URL", "postgresql://revive:revive_commons_2026@localhost/revive_commons")
new_processed = list(processed)

for msg in messages:
    msg_id = msg.get("message_id") or msg.get("id")
    if not msg_id or msg_id in processed:
        continue

    subject = msg.get("subject", "")
    from_addr = msg.get("from", {}).get("address", "") if isinstance(msg.get("from"), dict) else str(msg.get("from", ""))
    body_text = msg.get("text_body") or msg.get("text") or msg.get("body", "")
    
    # Extract item ID from subject line [item:UUID]
    item_match = re.search(r'\[item:([a-f0-9-]+)\]', subject)
    if not item_match:
        print(f"Skipping message {msg_id} - no item ID in subject: {subject}")
        new_processed.append(msg_id)
        continue
    
    item_id = item_match.group(1)
    
    # Clean the reply text - remove quoted content
    reply_text = body_text.strip()
    # Remove everything after "On ... wrote:" pattern (quoted reply)
    reply_text = re.split(r'\nOn .+wrote:\s*\n', reply_text)[0].strip()
    # Remove signature blocks
    reply_text = re.split(r'\n--\s*\n', reply_text)[0].strip()
    # Remove ">" quoted lines
    lines = [l for l in reply_text.split('\n') if not l.strip().startswith('>')]
    reply_text = '\n'.join(lines).strip()
    
    if not reply_text:
        print(f"Skipping message {msg_id} - empty reply after cleaning")
        new_processed.append(msg_id)
        continue
    
    # Find the user by email
    find_user_sql = f"SELECT id, name FROM users WHERE LOWER(email) = LOWER('{from_addr}') LIMIT 1"
    
    try:
        result = subprocess.run(
            ["psql", db_url, "-t", "-A", "-c", find_user_sql],
            capture_output=True, text=True, timeout=10
        )
        user_row = result.stdout.strip()
        if not user_row:
            print(f"No user found for {from_addr}, creating comment as system")
            # Insert as system comment (no user_id)
            clean_text = reply_text.replace("'", "''")
            insert_sql = f"INSERT INTO item_comments (item_id, comment) VALUES ('{item_id}', 'Reply from {from_addr}: {clean_text}')"
        else:
            user_id, user_name = user_row.split("|", 1)
            clean_text = reply_text.replace("'", "''")
            insert_sql = f"INSERT INTO item_comments (item_id, user_id, comment) VALUES ('{item_id}', '{user_id}', '{clean_text}')"
        
        result = subprocess.run(
            ["psql", db_url, "-c", insert_sql],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            print(f"Posted reply from {from_addr} to item {item_id}: {reply_text[:80]}...")
        else:
            print(f"DB error posting reply: {result.stderr}")
    except Exception as e:
        print(f"Error processing message {msg_id}: {e}")

    # Handle attachments
    attachments = msg.get("attachments", [])
    if attachments:
        item_photos = []
        try:
            # Fetch existing photos for the item
            fetch_photos_sql = f"SELECT photos FROM items WHERE id = '{item_id}'"
            result = subprocess.run(
                ["psql", db_url, "-t", "-A", "-c", fetch_photos_sql],
                capture_output=True, text=True, timeout=10
            )
            existing_photos_json = result.stdout.strip()
            if existing_photos_json:
                item_photos = json.loads(existing_photos_json)
                if not isinstance(item_photos, list):
                    item_photos = [] # Ensure it's a list
        except Exception as e:
            print(f"Error fetching existing photos for item {item_id}: {e}")
            item_photos = []

        for attachment in attachments:
            download_url = attachment.get("download_url")
            filename = attachment.get("filename")
            content_type = attachment.get("content_type")

            if download_url and filename and content_type and content_type.startswith("image/"):
                try:
                    # Ensure the public/uploads/items directory exists
                    os.makedirs("public/uploads/items", exist_ok=True)

                    # Generate a unique filename
                    file_extension = os.path.splitext(filename)[1]
                    unique_filename = f"item-{item_id}-{uuid.uuid4()}{file_extension}"
                    upload_path = f"public/uploads/items/{unique_filename}"
                    db_path = f"/uploads/items/{unique_filename}" # Path to store in DB

                    print(f"Downloading attachment {filename} to {upload_path}")
                    response = requests.get(download_url, stream=True, timeout=30)
                    response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

                    with open(upload_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    # Add to item_photos
                    item_photos.append(db_path)

                    print(f"Successfully downloaded and saved {filename}")

                except requests.exceptions.RequestException as req_e:
                    print(f"Error downloading {filename} from {download_url}: {req_e}")
                except IOError as io_e:
                    print(f"Error saving file {upload_path}: {io_e}")
                except Exception as e:
                    print(f"Unexpected error processing attachment {filename}: {e}")
            else:
                print(f"Skipping non-image attachment or missing download_url/filename/content_type: {filename} (Content-Type: {content_type})")
        
        # Update the item's photos JSONB array
        if item_photos:
            updated_photos_json = json.dumps(list(set(item_photos))) # Use set to remove duplicates, then convert to list
            update_photos_sql = f"UPDATE items SET photos = '{updated_photos_json}'::jsonb WHERE id = '{item_id}'"
            try:
                result = subprocess.run(
                    ["psql", db_url, "-c", update_photos_sql],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    print(f"Updated photos for item {item_id}")
                else:
                    print(f"DB error updating photos: {result.stderr}")
            except Exception as e:
                print(f"Error updating photos for item {item_id}: {e}")

    new_processed.append(msg_id)

# Save processed IDs (keep last 200)
with open(processed_file, "w") as f:
    json.dump(new_processed[-200:], f)

print(f"Processed {len(new_processed) - len(processed)} new messages")
PYEOF
