import nodemailer from "nodemailer";

let transporterInstance = null;

const getTransporter = async () => {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    try {
      await transporterInstance.verify();
    } catch (err) {
      transporterInstance = null;
      throw err;
    }
  }
  return transporterInstance;
};


export const sendOtpEmail = async (to, otp) => {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"EduNexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your EduNexus account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Email Verification</h2>
        <p>Your OTP for EduNexus email verification is:</p>
        <h1 style="letter-spacing: 8px; color: #6366f1;">${otp}</h1>
        <p>This OTP will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #888; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
};


export const sendResetPasswordEmail = async (to, resetLink) => {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"EduNexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your EduNexus password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}"
           style="padding: 10px 18px; background-color: #6366f1; color: #fff;
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
        <p>This link will expire in <strong>15 minutes</strong>.</p>
        <p style="color: #888; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
};


export const sendEnrollmentEmail = async (to, { studentName, courseName }) => {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"EduNexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: `You're enrolled in ${courseName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Enrollment Confirmed!</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>You have successfully enrolled in <strong>${courseName}</strong>.</p>
        <p>Start learning now on EduNexus!</p>
        <p style="color: #888; font-size: 12px;">
          Happy Learning!<br/>Team EduNexus
        </p>
      </div>
    `,
  });
};


export const sendPaymentSuccessEmail = async (to, { studentName, courseName, amount }) => {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"EduNexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Payment Successful — EduNexus",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payment Successful!</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your payment of <strong>₹${amount}</strong> for
           <strong>${courseName}</strong> was successful.</p>
        <p>You now have full access to the course.</p>
        <p style="color: #888; font-size: 12px;">
          Thank you for learning with EduNexus!
        </p>
      </div>
    `,
  });
};


// ─── NEW: Notify instructor when a student enrolls ─────────────────────────────
export const sendInstructorEnrollmentEmail = async (
  to,
  { instructorName, studentName, courseName, amount, enrolledAt }
) => {
  const transporter = await getTransporter();
  const dateStr = new Date(enrolledAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const amountStr = amount > 0 ? `₹${amount}` : "Free";

  await transporter.sendMail({
    from: `"EduNexus" <${process.env.EMAIL_USER}>`,
    to,
    subject: `New enrollment in ${courseName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Student Enrolled!</h2>
        <p>Hi <strong>${instructorName}</strong>,</p>
        <p>
          Great news! <strong>${studentName}</strong> has just enrolled in your course
          <strong>${courseName}</strong>.
        </p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 6px 16px 6px 0; color: #888;">Student</td>
            <td style="padding: 6px 0;"><strong>${studentName}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 16px 6px 0; color: #888;">Course</td>
            <td style="padding: 6px 0;"><strong>${courseName}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 16px 6px 0; color: #888;">Amount</td>
            <td style="padding: 6px 0;"><strong>${amountStr}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 16px 6px 0; color: #888;">Date</td>
            <td style="padding: 6px 0;">${dateStr}</td>
          </tr>
        </table>
        <p style="color: #888; font-size: 12px;">
          Keep up the great work!<br/>Team EduNexus
        </p>
      </div>
    `,
  });
};