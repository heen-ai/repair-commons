import nodemailer from "nodemailer";

export function createEmailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Skip sending in development if no SMTP password configured
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === "password") {
    console.log(`[DEV] Email to ${options.to}: ${options.subject}`);
    console.log(`[DEV] ${options.text}`);
    return true;
  }

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Repair Commons" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export interface RegistrationEmailData {
  email: string;
  name: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  items: string[];
  status: string;
}

export async function sendRegistrationConfirmation(data: RegistrationEmailData): Promise<boolean> {
  const itemsList = data.items.length > 0 
    ? data.items.map(item => `• ${item}`).join("\n")
    : "• No items registered";
  
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.venueAddress)}`;
  const manageUrl = `${process.env.APP_URL || "http://localhost:3300"}/auth/signin`;

  const subject = `Confirmation: ${data.eventName} - ${data.status === "waitlisted" ? "Waitlisted" : "Registered"}`;

  const text = `Hi ${data.name},

You're ${data.status === "waitlisted" ? "on the waitlist" : "registered"} for ${data.eventName}!

EVENT DETAILS:
Date: ${data.eventDate}
Time: ${data.eventTime}
Venue: ${data.venueName}
Address: ${data.venueAddress}

ITEMS REGISTERED:
${itemsList}

VENUE DIRECTIONS:
${googleMapsUrl}

MANAGE REGISTRATION:
${manageUrl}

- Repair Commons Team`;

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #15803d; margin-bottom: 8px;">Repair Commons</h2>
      <p style="font-size: 16px;">Hi ${data.name},</p>
      <p style="font-size: 16px;">
        You're <strong>${data.status === "waitlisted" ? "on the waitlist" : "registered"}</strong> for 
        <strong>${data.eventName}</strong>!
      </p>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Event Details</h3>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${data.eventDate}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${data.eventTime}</p>
        <p style="margin: 4px 0;"><strong>Venue:</strong> ${data.venueName}</p>
        <p style="margin: 4px 0;"><strong>Address:</strong> ${data.venueAddress}</p>
      </div>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Items Registered</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${data.items.length > 0 
            ? data.items.map(item => `<li style="margin: 4px 0;">${item}</li>`).join("")
            : "<li>No items registered</li>"}
        </ul>
      </div>
      
      <a href="${googleMapsUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0;">
        Get Directions
      </a>
      
      <a href="${manageUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 8px 8px 0;">
        Manage Registration
      </a>
      
      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        - The Repair Commons Team
      </p>
    </div>
  `;

  return sendEmail({
    to: data.email,
    subject,
    text,
    html,
  });
}
