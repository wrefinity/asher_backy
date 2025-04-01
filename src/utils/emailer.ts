import nodemailer from 'nodemailer';
import { MAIL_HOST, MAIL_PORT, MAIL_USERNAME, FROM_EMAIL, MAIL_PASSWORD } from "../secrets"
import logger from "./loggers";

const sendMail = async (to: string, subject: string, html: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: Number(MAIL_PORT),
    host: MAIL_HOST,
    secure: false,
    auth: {
      user: FROM_EMAIL,
      pass: MAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: FROM_EMAIL,
    to: to,
    subject: subject,
    html: html
  };

  logger.info(`Sending mail to - ${to}`);
  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      logger.error(error);
    } else {
      logger.info('Email sent: ' + info.response);
    }
  });
}

// URLs
const guarantorURL = "https://asher-website.vercel.app/guarantor";
const employerURL = "https://asher-website.vercel.app/employer";
const landlordURL = "https://asher-website.vercel.app/landlord";

// Interface for template data
interface EmailTemplate {
  subject: string;
  html: string;
}

// Template definitions
const applicationCompletionTemplates = {
  guarantor: (application: any): EmailTemplate => ({
    subject: 'Application Completion Notification - Guarantor',
    html: `<p>Dear ${application.guarantorInformation?.fullName || 'Guarantor'},</p>
          <p>The leasing application request by ${application.user?.profile?.firstName} ${application.user?.profile?.lastName} 
          (Application ID: ${application.id}) has been completed and requires your attention for Attestation.</p>
          <p>Follow the link below to complete the application attestation:<br/>
          <a href="${guarantorURL}/${application.id}">${guarantorURL}/${application.id}</a></p>
          <p><em>This link will expire in 72 hours.</em></p>`
  }),

  employer: (application: any): EmailTemplate => ({
    subject: 'Employment Verification Request - Employer',
    html: `<p>Dear ${application.employmentInfo?.employerName || 'Employer'},</p>
          <p>The leasing application submitted by ${application.user?.profile?.firstName} ${application.user?.profile?.lastName} 
          (Application ID: ${application.id}) requires your employment verification.</p>
          <p>Please use the link below to complete the employment verification:<br/>
          <a href="${employerURL}/${application.id}">${employerURL}/${application.id}</a></p>
          <p><em>This verification request will expire in 7 business days.</em></p>`
  }),

  landlord: (application: any): EmailTemplate => {
    // Extract landlord info from residential information
    const residentialInfo = application.residentialInfo;
    const mostRecentAddress = residentialInfo?.prevAddresses?.[0];

    return {
      subject: 'Tenancy Verification Request',
      html: `<p>Dear ${residentialInfo?.landlordOrAgencyName || 'Valued Customer'},</p>
            <p>${application.user?.profile?.firstName} ${application.user?.profile?.lastName} 
            has listed your property at ${mostRecentAddress?.address || 'a previous address'}.</p>
            
            <p>Please confirm their tenancy details:</p>
            <ul>
              <li>Duration: ${mostRecentAddress?.lengthOfResidence || 'N/A'}</li>
              <li>Move-out Reason: ${residentialInfo?.reasonForLeaving || 'N/A'}</li>
            </ul>
            
            <p>Click here to verify: 
            <a href="${landlordURL}/${application.id}">Verify Tenancy</a></p>`
    };
  }
};

// Email sending function
export const sendApplicationCompletionEmails = async (application: any) => {
  try {
    const recipients = {
      guarantor: application.guarantorInformation?.email,
      employer: application.employmentInfo?.employerEmail,
      landlord: application.residentialInfo?.landlordOrAgencyEmail
    };

    // Prepare all email templates first
    const [guarantorTemplate, employerTemplate, landlordTemplate] = await Promise.all([
      applicationCompletionTemplates.guarantor(application),
      applicationCompletionTemplates.employer(application),
      applicationCompletionTemplates.landlord(application)
    ]);

    // Send emails in parallel
    await Promise.all([
      recipients.guarantor && sendMail(
        recipients.guarantor,
        guarantorTemplate.subject,
        guarantorTemplate.html
      ),
      recipients.employer && sendMail(
        recipients.employer,
        employerTemplate.subject,
        employerTemplate.html
      ),
      recipients.landlord && sendMail(
        recipients.landlord,
        landlordTemplate.subject,
        landlordTemplate.html
      )
    ]);
  } catch (emailError) {
    logger.error('Failed to send completion emails:', emailError);
    throw emailError;
  }
};

export default sendMail