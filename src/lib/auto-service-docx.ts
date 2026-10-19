"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";
import saveAs from "file-saver";
import { RepairOrder, ServiceDocumentType } from "./auto-service-types";
import { SERVICE_COMPANY_REQUISITES, formatCurrency } from "./auto-service-data";

export async function createAutoServiceDocx(order: RepairOrder, docType: ServiceDocumentType) {
  const req = SERVICE_COMPANY_REQUISITES;
  const borderThin = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  const cellBorders = {
    top: borderThin,
    bottom: borderThin,
    left: borderThin,
    right: borderThin,
  };

  const getDocTitle = () => {
    switch (docType) {
      case "work_order":
        return `ЗАКАЗ-НАРЯД № ${order.orderNumber}`;
      case "acceptance_act":
        return `АКТ ПРИЕМА-ПЕРЕДАЧИ ТС К ЗАКАЗ-НАРЯДУ № ${order.orderNumber}`;
      case "completion_act":
        return `АКТ ВЫПОЛНЕННЫХ РАБОТ № ${order.orderNumber}`;
      case "invoice":
        return `СЧЕТ НА ОПЛАТУ № ${order.orderNumber}`;
      case "defect_sheet":
        return `ДЕФЕКТОВОЧНАЯ ВЕДОМОСТЬ № ${order.orderNumber}`;
    }
  };

  // Header Paragraphs
  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: req.name.toUpperCase(),
          bold: true,
          size: 24,
          color: "CC0000",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${req.address} • Тел: ${req.phone} • Email: ${req.email}`,
          size: 18,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `ИНН: ${req.inn} / КПП: ${req.kpp} / ОГРН: ${req.ogrn}`,
          size: 16,
          color: "888888",
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: getDocTitle(),
          bold: true,
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `от ${order.createdAt} г.`,
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  // Client & Vehicle Info Table
  const clientRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: "Заказчик / Клиент:", bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${order.client.name} (тел: ${order.client.phone}${order.client.inn ? `, ИНН: ${order.client.inn}` : ""})`,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: "Автомобиль (ТС):", bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${order.vehicle.make} ${order.vehicle.model} (${order.vehicle.year} г.в.)`,
                  size: 18,
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: "Госномер / VIN:", bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Госномер: ${order.vehicle.licensePlate}   |   VIN: ${order.vehicle.vin}   |   Пробег: ${order.vehicle.mileage.toLocaleString()} км`,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: "Причина обращения:", bold: true, size: 18 })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: order.vehicle.complaints || "Техническое обслуживание", size: 18 })],
            }),
          ],
        }),
      ],
    }),
  ];

  children.push(new Table({ rows: clientRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  children.push(new Paragraph({ text: "" }));

  // 1. WORKS TABLE
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "1. Выполняемые работы и услуги", bold: true, size: 20 })],
    })
  );

  const workHeaderRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "№", bold: true, size: 16 })] })], borders: cellBorders }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Наименование работы", bold: true, size: 16 })] })], borders: cellBorders }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Мастер", bold: true, size: 16 })] })], borders: cellBorders }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Н/Ч", bold: true, size: 16 })] })], borders: cellBorders }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ставка (₽)", bold: true, size: 16 })] })], borders: cellBorders }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Итого (₽)", bold: true, size: 16 })] })], borders: cellBorders }),
    ],
  });

  const workDataRows = order.works.map((w, idx) => {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: `${idx + 1}` })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ text: w.name })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ text: w.mechanic || "—" })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ text: `${w.laborHours}` })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ text: `${w.ratePerHour}` })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ text: `${w.total}` })], borders: cellBorders }),
      ],
    });
  });

  children.push(new Table({ rows: [workHeaderRow, ...workDataRows], width: { size: 100, type: WidthType.PERCENTAGE } }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `Всего по работам: ${formatCurrency(order.totalWorks)}`, bold: true, size: 18 })],
    })
  );
  children.push(new Paragraph({ text: "" }));

  // 2. PARTS TABLE
  if (order.parts.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "2. Запасные части и расходные материалы", bold: true, size: 20 })],
      })
    );

    const partHeaderRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "№", bold: true, size: 16 })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Артикул OEM", bold: true, size: 16 })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Наименование детали", bold: true, size: 16 })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Кол-во", bold: true, size: 16 })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Цена (₽)", bold: true, size: 16 })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Сумма (₽)", bold: true, size: 16 })] })], borders: cellBorders }),
      ],
    });

    const partDataRows = order.parts.map((p, idx) => {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: `${idx + 1}` })], borders: cellBorders }),
          new TableCell({ children: [new Paragraph({ text: p.oem || "—" })], borders: cellBorders }),
          new TableCell({ children: [new Paragraph({ text: p.name })], borders: cellBorders }),
          new TableCell({ children: [new Paragraph({ text: `${p.qty} ${p.unit}` })], borders: cellBorders }),
          new TableCell({ children: [new Paragraph({ text: `${p.salePrice}` })], borders: cellBorders }),
          new TableCell({ children: [new Paragraph({ text: `${p.total}` })], borders: cellBorders }),
        ],
      });
    });

    children.push(new Table({ rows: [partHeaderRow, ...partDataRows], width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: `Всего по запчастям: ${formatCurrency(order.totalParts)}`, bold: true, size: 18 })],
      })
    );
    children.push(new Paragraph({ text: "" }));
  }

  // GRAND TOTAL
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `ИТОГО К ОПЛАТЕ: ${formatCurrency(order.grandTotal)}`,
          bold: true,
          size: 24,
          color: "CC0000",
        }),
      ],
    })
  );
  children.push(new Paragraph({ text: "" }));

  // WARRANTY & LEGAL
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Гарантийные обязательства: на выполненные слесарные работы — ${order.warrantyDaysWorks || 30} дней, на установленные оригинальные запасные части — ${order.warrantyDaysParts || 14} дней.`,
          size: 16,
          italics: true,
          color: "555555",
        }),
      ],
    })
  );
  children.push(new Paragraph({ text: "" }));

  // Signatures
  const sigRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Исполнитель (Мастер-приемщик):", bold: true, size: 16 })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: `________________ / ${order.masterName || req.masterReceiver} /`, size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: "М.П.", size: 14, color: "999999" })] }),
        ],
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Заказчик (С объемом и стоимостью согласен):", bold: true, size: 16 })] }),
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: `________________ / ${order.client.name} /`, size: 16 })] }),
        ],
      }),
    ],
  });

  children.push(new Table({ rows: [sigRow], width: { size: 100, type: WidthType.PERCENTAGE } }));

  return new Document({
    sections: [{ children }],
  });
}

export async function exportAutoServiceDocx(order: RepairOrder, docType: ServiceDocumentType) {
  const doc = await createAutoServiceDocx(order, docType);
  const blob = await Packer.toBlob(doc);
  const cleanFilename = `${order.orderNumber}_${docType}_${order.vehicle.licensePlate}.docx`;
  saveAs(blob, cleanFilename);
}
