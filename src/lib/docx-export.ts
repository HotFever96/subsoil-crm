import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { ProjectCategory, MiningProjectMetadata, ProjectSubSection } from "./project-types";

/**
 * Clean simple markdown into text paragraphs and bullet points
 */
function cleanMarkdownText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("|") && !line.startsWith("---"));
}

export async function exportProjectToDocx(
  metadata: MiningProjectMetadata,
  categories: ProjectCategory[]
) {
  const docParagraphs: Paragraph[] = [];

  // Title Page Header
  docParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "МИНИСТЕРСТВО ПРИРОДНЫХ РЕСУРСОВ И ЭКОЛОГИИ РОССИЙСКОЙ ФЕДЕРАЦИИ",
          bold: true,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `НЕДРОПОЛЬЗОВАТЕЛЬ: ${metadata.holderCompany.toUpperCase()}`,
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 300 },
      children: [
        new TextRun({
          text: metadata.title.toUpperCase(),
          bold: true,
          size: 28,
          font: "Times New Roman",
          color: "111620",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Лицензия на пользование недрами: ${metadata.licenseCode}`,
          size: 24,
          font: "Times New Roman",
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [
        new TextRun({
          text: `Месторождение: ${metadata.depositName} (${metadata.region})`,
          size: 22,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Metadata summary block
  docParagraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "КРАТКИЙ ПАСПОРТ МЕСТОРОЖДЕНИЯ",
          bold: true,
          size: 24,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `• Вид полезного ископаемого: `, bold: true, font: "Times New Roman" }),
        new TextRun({ text: metadata.mineralType, font: "Times New Roman" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `• Площадь лицензионного участка: `, bold: true, font: "Times New Roman" }),
        new TextRun({ text: `${metadata.subsoilPlotAreaHa} га`, font: "Times New Roman" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `• Годовая проектная мощность: `, bold: true, font: "Times New Roman" }),
        new TextRun({ text: `${metadata.annualCapacityThousandM3} тыс. м³/год`, font: "Times New Roman" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: `• Максимальная глубина карьера: `, bold: true, font: "Times New Roman" }),
        new TextRun({ text: `${metadata.quarryDepthM} м`, font: "Times New Roman" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `• Средний эксплуатационный коэффициент вскрыши: `, bold: true, font: "Times New Roman" }),
        new TextRun({ text: `${metadata.strippingRatio} м³/м³`, font: "Times New Roman" }),
      ],
    })
  );

  // Sections and subsections
  for (const cat of categories) {
    docParagraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
        children: [
          new TextRun({
            text: `${cat.code.toUpperCase()}: ${cat.title.toUpperCase()}`,
            bold: true,
            size: 26,
            font: "Times New Roman",
            color: "0a1019",
          }),
        ],
      })
    );

    for (const sub of cat.subsections) {
      docParagraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [
            new TextRun({
              text: `${sub.code}. ${sub.title}`,
              bold: true,
              size: 22,
              font: "Times New Roman",
            }),
            new TextRun({
              text: ` [Статус: ${sub.status === "APPROVED" ? "УТВЕРЖДЕНО" : "ЧЕРНОВИК"}]`,
              size: 18,
              italics: true,
              color: sub.status === "APPROVED" ? "006400" : "b8860b",
            }),
          ],
        })
      );

      // Clean text lines
      const lines = cleanMarkdownText(sub.content);
      for (const line of lines) {
        if (line.startsWith("#")) {
          continue; // skip markdown header lines in body
        }
        docParagraphs.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: line.replace(/[*_#`$]/g, ""),
                size: 22,
                font: "Times New Roman",
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Технический_проект_${metadata.licenseCode.replace(/\s+/g, "_")}.docx`);
}

export function exportSingleSubSectionToDocx(
  sub: ProjectSubSection,
  metadata: MiningProjectMetadata
) {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `ВЫПИСКА ИЗ ТЕХНИЧЕСКОГО ПРОЕКТА РАЗРАБОТКИ (Лицензия ${metadata.licenseCode})`,
          bold: true,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: `Подраздел ${sub.code}: ${sub.title}`,
          bold: true,
          size: 26,
          font: "Times New Roman",
        }),
      ],
    }),
  ];

  const lines = cleanMarkdownText(sub.content);
  for (const line of lines) {
    if (!line.startsWith("#")) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: line.replace(/[*_#`$]/g, ""),
              size: 22,
              font: "Times New Roman",
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `Раздел_${sub.code}_${metadata.licenseCode.replace(/\s+/g, "_")}.docx`);
  });
}
