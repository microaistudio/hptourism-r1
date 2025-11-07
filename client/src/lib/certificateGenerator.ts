import jsPDF from "jspdf";
import type { HomestayApplication } from "@shared/schema";

export type CertificateFormat = "classic" | "modern" | "heritage";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "N/A";

const buildAddress = (application: HomestayApplication) =>
  `${application.address || ""}, ${application.district || ""}, PIN: ${
    application.pincode || "—"
  }`;

export function generateCertificatePDF(
  application: HomestayApplication,
  format: CertificateFormat = "classic",
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  switch (format) {
    case "modern":
      renderModernCertificate(doc, application);
      break;
    case "heritage":
      renderHeritageCertificate(doc, application);
      break;
    default:
      renderClassicCertificate(doc, application);
      break;
  }

  const filename = `HP_Homestay_Certificate_${application.certificateNumber || "N_A"}_${format}.pdf`;
  doc.save(filename);
}

function renderClassicCertificate(doc: jsPDF, application: HomestayApplication) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primary = [14, 116, 144];
  const accent = [184, 134, 11];
  const dark = [32, 60, 70];

  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.6);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.rect(16, 16, pageWidth - 32, pageHeight - 32);

  let y = 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("GOVERNMENT OF HIMACHAL PRADESH", pageWidth / 2, y, {
    align: "center",
  });

  y += 8;
  doc.setFontSize(14);
  doc.text("Department of Tourism & Civil Aviation", pageWidth / 2, y, {
    align: "center",
  });

  y += 12;
  doc.setFontSize(22);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("HOMESTAY REGISTRATION CERTIFICATE", pageWidth / 2, y, {
    align: "center",
  });
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.8);
  doc.line(38, y + 2, pageWidth - 38, y + 2);

  y += 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Certificate Number:", pageWidth / 2, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text(application.certificateNumber || "N/A", pageWidth / 2, y, {
    align: "center",
  });

  y += 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text(
    "This is to certify that the homestay mentioned below has been registered under the",
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Himachal Pradesh Homestay Rules 2025", pageWidth / 2, y, {
    align: "center",
  });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(
    "and is authorized to operate as a registered homestay establishment.",
    pageWidth / 2,
    y,
    { align: "center" },
  );

  y += 15;
  doc.setFillColor(245, 250, 252);
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(25, y, pageWidth - 50, 70, 2, 2, "FD");

  let lineY = y + 10;
  const left = 32;
  const valueX = 88;
  doc.setFontSize(10);

  const writePair = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(label, left, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(value || "—", valueX, lineY);
    lineY += 8;
  };

  writePair("Property Name:", application.propertyName);
  writePair("Owner Name:", application.ownerName);
  writePair("Address:", buildAddress(application));
  writePair(
    "Category:",
    application.category
      ? application.category.charAt(0).toUpperCase() + application.category.slice(1)
      : "—",
  );
  writePair("Total Rooms:", `${application.totalRooms || 0}`);
  writePair("Application No:", application.applicationNumber || "—");
  writePair("Issue Date:", formatDate(application.certificateIssuedDate));
  writePair("Valid Until:", formatDate(application.certificateExpiryDate));

  doc.setFillColor(255, 250, 240);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.roundedRect(25, lineY + 4, pageWidth - 50, 20, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 93, 0);
  doc.text("IMPORTANT:", 30, lineY + 12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    "This certificate must be displayed prominently at the homestay premises.",
    30,
    lineY + 18,
  );
  doc.text(
    "Certificate is subject to compliance with Himachal Pradesh Homestay Rules 2025.",
    30,
    lineY + 22,
  );

  drawSignatures(doc, pageWidth, pageHeight, application);
}

function renderModernCertificate(doc: jsPDF, application: HomestayApplication) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(4, 47, 73);
  doc.rect(0, 0, pageWidth, 60, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(8, 50, pageWidth - 16, pageHeight - 60, 6, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("HP TOURISM • HOMESTAY CERTIFICATE", pageWidth / 2, 30, {
    align: "center",
  });
  doc.setFontSize(11);
  doc.text("Department of Tourism & Civil Aviation", pageWidth / 2, 38, {
    align: "center",
  });

  let y = 70;
  doc.setFontSize(26);
  doc.setTextColor(5, 79, 102);
  doc.text(application.certificateNumber || "N/A", pageWidth / 2, y, {
    align: "center",
  });

  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(
    "This certifies that the following homestay has been approved under the Himachal Pradesh Homestay Rules 2025.",
    pageWidth / 2,
    y,
    { align: "center", maxWidth: pageWidth - 40 },
  );

  y += 16;
  doc.setDrawColor(232, 241, 247);
  doc.setFillColor(248, 252, 255);
  doc.roundedRect(20, y, pageWidth - 40, 70, 4, 4, "FD");

  const columnLeft = 28;
  const columnRight = columnLeft + (pageWidth - 56) / 2 + 6;
  let leftY = y + 12;
  let rightY = leftY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(5, 79, 102);

  const write = (label: string, value: string, startX: number, startY: number) => {
    doc.text(label, startX, startY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(value || "—", startX, startY + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 79, 102);
  };

  write("Property Name", application.propertyName, columnLeft, leftY);
  leftY += 12;
  write("Owner", application.ownerName, columnLeft, leftY);
  leftY += 12;
  write("Location", buildAddress(application), columnLeft, leftY);
  leftY += 12;
  write("Application No.", application.applicationNumber || "—", columnLeft, leftY);

  write(
    "Category",
    application.category
      ? application.category.charAt(0).toUpperCase() + application.category.slice(1)
      : "—",
    columnRight,
    rightY,
  );
  rightY += 12;
  write("Total Rooms", `${application.totalRooms || 0}`, columnRight, rightY);
  rightY += 12;
  write("Issue Date", formatDate(application.certificateIssuedDate), columnRight, rightY);
  rightY += 12;
  write("Valid Until", formatDate(application.certificateExpiryDate), columnRight, rightY);

  y += 90;
  doc.setFillColor(4, 47, 73);
  doc.setTextColor(4, 47, 73);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("COMPLIANCE", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    "Display this certificate prominently at the property. Operating authorization is subject to continued compliance with HP Homestay Rules 2025.",
    20,
    y + 6,
    { maxWidth: pageWidth - 40 },
  );

  drawSignatures(doc, pageWidth, pageHeight, application, {
    primaryColor: [4, 47, 73],
  });
}

function renderHeritageCertificate(doc: jsPDF, application: HomestayApplication) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(250, 247, 238);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setDrawColor(120, 90, 40);
  doc.setLineWidth(2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
  doc.setDrawColor(165, 124, 44);
  doc.setLineWidth(0.7);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  let y = 34;
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(111, 78, 55);
  doc.text("Government of Himachal Pradesh", pageWidth / 2, y, {
    align: "center",
  });
  y += 8;
  doc.setFontSize(14);
  doc.text("Department of Tourism & Civil Aviation", pageWidth / 2, y, {
    align: "center",
  });

  y += 14;
  doc.setFontSize(28);
  doc.text("Certificate of Registration", pageWidth / 2, y, {
    align: "center",
  });

  y += 12;
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.text(
    `Certificate No. ${application.certificateNumber || "N/A"}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );

  y += 18;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(
    "By the authority vested in the HP Tourism Department, this document affirms the registration of the homestay described below,",
    pageWidth / 2,
    y,
    { align: "center", maxWidth: pageWidth - 50 },
  );
  y += 6;
  doc.text(
    "under the Himachal Pradesh Homestay Rules 2025, granting permission to host guests as a recognized establishment.",
    pageWidth / 2,
    y,
    { align: "center", maxWidth: pageWidth - 50 },
  );

  y += 15;
  doc.setDrawColor(165, 124, 44);
  doc.setFillColor(253, 249, 241);
  doc.roundedRect(25, y, pageWidth - 50, 85, 4, 4, "FD");

  const writeRow = (label: string, value: string, rowY: number) => {
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(111, 78, 55);
    doc.text(label, 32, rowY);
    doc.setFont("times", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value || "—", 75, rowY);
  };

  let detailY = y + 12;
  writeRow("Property Name", application.propertyName, detailY);
  detailY += 10;
  writeRow("Owner", application.ownerName, detailY);
  detailY += 10;
  writeRow("Location", buildAddress(application), detailY);
  detailY += 10;
  writeRow("Category", application.category || "—", detailY);
  detailY += 10;
  writeRow("Total Rooms", `${application.totalRooms || 0}`, detailY);
  detailY += 10;
  writeRow("Application No.", application.applicationNumber || "—", detailY);
  detailY += 10;
  writeRow("Issued On", formatDate(application.certificateIssuedDate), detailY);
  detailY += 10;
  writeRow("Valid Until", formatDate(application.certificateExpiryDate), detailY);

  y += 100;
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(111, 78, 55);
  doc.text("Important Stipulations", 25, y);
  doc.setFont("times", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    [
      "• Display this certificate prominently at the homestay property.",
      "• Registration remains subject to adherence with HP Homestay Rules 2025.",
      "• Any change in ownership or property configuration must be reported for revalidation.",
    ],
    28,
    y + 6,
  );

  drawSignatures(doc, pageWidth, pageHeight, application, {
    primaryColor: [111, 78, 55],
    italicFooter: true,
  });
}

function drawSignatures(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  application: HomestayApplication,
  options?: { primaryColor?: [number, number, number]; italicFooter?: boolean },
) {
  const primary = options?.primaryColor ?? [80, 80, 80];
  const leftX = 40;
  const rightX = pageWidth - 90;
  const baseY = pageHeight - 40;

  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.3);
  doc.line(leftX, baseY, leftX + 50, baseY);
  doc.line(rightX, baseY, rightX + 50, baseY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("Authorized Signatory", leftX + 10, baseY + 6);
  doc.text("Seal & Signature", rightX + 12, baseY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("District Tourism Officer", leftX + 8, baseY + 11);
  doc.text("Department of Tourism", rightX + 8, baseY + 11);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", options?.italicFooter ? "italic" : "normal");
  doc.text(
    "This is a computer-generated certificate issued by HP Tourism eServices Portal",
    pageWidth / 2,
    pageHeight - 18,
    { align: "center" },
  );
  doc.text(
    `Verify online at https://eservices.himachaltourism.gov.in/verify/${application.certificateNumber || ""}`,
    pageWidth / 2,
    pageHeight - 13,
    { align: "center" },
  );
}
