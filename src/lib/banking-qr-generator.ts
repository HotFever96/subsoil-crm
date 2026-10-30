import QRCode from "qrcode";
import { StoCompanyRequisites } from "./auto-service-types";

export interface BankingQrParams {
  requisites: StoCompanyRequisites;
  invoiceNumber: string;
  totalAmount: number; // in Rubles
  purpose?: string;
}

/**
 * Builds standard Russian Banking QR string (ГОСТ Р 56042-2014)
 */
export function buildGostBankingQrString(params: BankingQrParams): string {
  const { requisites, invoiceNumber, totalAmount, purpose } = params;

  // Amount in kopecks (cents) according to GOST standard
  const sumKopecks = Math.max(0, Math.round((totalAmount || 0) * 100));

  const cleanName = (requisites.name || "ИП Водоватовский Антон Игоревич").trim();
  const cleanRs = (requisites.rs || "40802810038310009505").trim();
  const cleanBank = (requisites.bankName || "Филиал «Екатеринбургский» АО «АЛЬФА-БАНК»").trim();
  const cleanBik = (requisites.bik || "046577964").trim();
  const cleanKs = (requisites.ks || "30101810100000000964").trim();
  const cleanInn = (requisites.inn || "263112957774").trim();
  const defaultPurpose = purpose || `Оплата по счету № ${invoiceNumber} за услуги ремонта и автозапчасти. Без НДС`;

  const fields = [
    "ST00012",
    `Name=${cleanName}`,
    `PersonalAcc=${cleanRs}`,
    `BankName=${cleanBank}`,
    `BIC=${cleanBik}`,
    `CorrespAcc=${cleanKs}`,
    `PayeeINN=${cleanInn}`,
    requisites.kpp ? `KPP=${requisites.kpp}` : null,
    `Sum=${sumKopecks}`,
    `Purpose=${defaultPurpose}`,
  ].filter(Boolean);

  return fields.join("|");
}

/**
 * Generates Base64 Data URL for the banking QR code image
 */
export async function generateBankingQrCodeDataUrl(params: BankingQrParams): Promise<string> {
  const qrString = buildGostBankingQrString(params);
  try {
    const dataUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    return dataUrl;
  } catch (err) {
    console.error("Failed to generate banking QR code:", err);
    return "";
  }
}
