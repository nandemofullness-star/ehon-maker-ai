import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";

// KDP standard: 8.5 inches at 300 DPI = 2550px, 215.9mm
const KDP_SIZE_MM = 215.9;

async function generatePdfBuffer(
  pages: Array<{ base64: string; text: string }>
): Promise<Buffer> {
  // Dynamic import for pdfkit (CommonJS module)
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const mmToPoints = (mm: number) => mm * 2.8346456693;
    const pageSize = mmToPoints(KDP_SIZE_MM);

    const doc = new PDFDocument({
      size: [pageSize, pageSize],
      margin: 0,
      autoFirstPage: false,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      doc.addPage({ size: [pageSize, pageSize], margin: 0 });

      try {
        // Decode base64 image and add to PDF
        const imageBuffer = Buffer.from(page.base64, "base64");
        doc.image(imageBuffer, 0, 0, {
          width: pageSize,
          height: pageSize,
          cover: [pageSize, pageSize],
        });

        // Add text if present
        if (page.text && page.text.trim()) {
          const fontSize = pageSize * 0.04;
          const margin = pageSize * 0.08;

          // Text shadow/outline for legibility
          doc
            .fontSize(fontSize)
            .fillColor("white")
            .opacity(0.9)
            .text(page.text, margin, pageSize - margin - fontSize * 2, {
              width: pageSize - margin * 2,
              align: "center",
            });

          doc
            .fillColor("#2D3748")
            .opacity(1)
            .text(page.text, margin, pageSize - margin - fontSize * 2, {
              width: pageSize - margin * 2,
              align: "center",
            });
        }
      } catch (err) {
        console.error(`Page ${i + 1} image error:`, err);
        // Add blank white page on error
        doc.rect(0, 0, pageSize, pageSize).fill("white");
      }
    }

    doc.end();
  });
}

export const bookRouter = router({
  // AI image remake: transform photo to storybook illustration
  remakeImage: publicProcedure
    .input(
      z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateImage({
        prompt:
          "GENERATE IMAGE: Transform this photo into a cute, simple storybook illustration for a 3-year-old child. Style: thick clean outlines, bright pastel colors, warm and friendly, flat illustration. Main subject should be recognizable but in a gentle drawing style. 1:1 aspect ratio.",
        originalImages: [
          {
            b64Json: input.imageBase64,
            mimeType: input.mimeType,
          },
        ],
      });

      return {
        imageUrl: result.url ?? null,
      };
    }),

  // Generate KDP PDF from pages
  generatePdf: publicProcedure
    .input(
      z.object({
        pages: z.array(
          z.object({
            base64: z.string(),
            text: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      if (input.pages.length === 0) {
        throw new Error("ページが空です");
      }

      const pdfBuffer = await generatePdfBuffer(input.pages);

      // Upload PDF to storage
      const { url } = await storagePut(
        `pdfs/kdp_picture_book_${Date.now()}.pdf`,
        pdfBuffer,
        "application/pdf"
      );

      return {
        pdfUrl: url,
      };
    }),
});
