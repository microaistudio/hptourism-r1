import jsPDF from 'jspdf';
import type { HomestayApplication } from '@shared/schema';

export function generateCertificatePDF(application: HomestayApplication) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors
  const primaryGreen = [14, 116, 144]; // HP Tourism teal-green
  const darkGreen = [10, 80, 100];
  const goldColor = [184, 134, 11];
  
  // Border - Ornamental double border
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
  
  // Inner decorative border
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  // Header Section
  let yPosition = 25;
  
  // Government of Himachal Pradesh header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('GOVERNMENT OF HIMACHAL PRADESH', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 8;
  doc.setFontSize(14);
  doc.text('Department of Tourism & Civil Aviation', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 12;
  
  // Certificate Title with decorative underline
  doc.setFontSize(22);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.text('HOMESTAY REGISTRATION CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
  
  // Decorative line under title
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setLineWidth(0.8);
  doc.line(40, yPosition + 2, pageWidth - 40, yPosition + 2);
  
  yPosition += 15;
  
  // Certificate Number - prominent display
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Certificate Number:', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text(application.certificateNumber || 'N/A', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // Main certification text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  const certificationText = 'This is to certify that the homestay mentioned below has been registered under the';
  doc.text(certificationText, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Himachal Pradesh Homestay Rules 2025', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('and is authorized to operate as a registered homestay establishment.', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 18;
  
  // Property Details Box
  doc.setFillColor(245, 250, 252);
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(25, yPosition, pageWidth - 50, 65, 2, 2, 'FD');
  
  yPosition += 8;
  
  // Property details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  
  const leftMargin = 30;
  const valueMargin = 80;
  
  doc.text('Property Name:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(application.propertyName, valueMargin, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('Owner Name:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(application.ownerName, valueMargin, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('Address:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const address = `${application.address}, ${application.district}, PIN: ${application.pincode}`;
  doc.text(address, valueMargin, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('Category:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const categoryText = application.category.charAt(0).toUpperCase() + application.category.slice(1);
  doc.text(categoryText, valueMargin, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('Total Rooms:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(application.totalRooms.toString(), valueMargin, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text('Application No:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(application.applicationNumber, valueMargin, yPosition);
  
  yPosition += 15;
  
  // Validity Period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  
  const issueDate = application.certificateIssuedDate 
    ? new Date(application.certificateIssuedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';
  const expiryDate = application.certificateExpiryDate 
    ? new Date(application.certificateExpiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';
  
  doc.text('Issue Date:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(issueDate, valueMargin, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Valid Until:', leftMargin, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(expiryDate, valueMargin, yPosition);
  
  yPosition += 18;
  
  // Important Notice
  doc.setFillColor(255, 250, 240);
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.roundedRect(25, yPosition, pageWidth - 50, 20, 2, 2, 'FD');
  
  yPosition += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 80, 0);
  doc.text('IMPORTANT:', leftMargin, yPosition);
  
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('This certificate must be displayed prominently at the homestay premises.', leftMargin, yPosition);
  yPosition += 4;
  doc.text('Certificate is subject to compliance with Himachal Pradesh Homestay Rules 2025.', leftMargin, yPosition);
  
  yPosition += 15;
  
  // Signature section
  const sigLeftX = 35;
  const sigRightX = pageWidth - 75;
  
  // Left signature
  doc.setLineWidth(0.3);
  doc.setDrawColor(100, 100, 100);
  doc.line(sigLeftX, yPosition, sigLeftX + 40, yPosition);
  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Authorized Signatory', sigLeftX + 8, yPosition);
  yPosition += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('District Tourism Officer', sigLeftX + 6, yPosition);
  
  // Right signature (back to original y for alignment)
  yPosition -= 9;
  doc.setLineWidth(0.3);
  doc.line(sigRightX, yPosition, sigRightX + 40, yPosition);
  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Seal & Signature', sigRightX + 10, yPosition);
  yPosition += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Department of Tourism', sigRightX + 6, yPosition);
  
  yPosition += 12;
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'italic');
  const footerText = 'This is a computer-generated certificate issued by HP Tourism eServices Portal';
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  doc.setFontSize(7);
  const verificationText = `Verify online at: https://eservices.himachaltourism.gov.in/verify/${application.certificateNumber}`;
  doc.text(verificationText, pageWidth / 2, pageHeight - 11, { align: 'center' });
  
  // Generate filename and download
  const filename = `HP_Homestay_Certificate_${application.certificateNumber}.pdf`;
  doc.save(filename);
}
