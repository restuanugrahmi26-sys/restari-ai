
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Periksa API key
if (!process.env.OPENAI_API_KEY) {
    console.error("API KEY belum diisi di file .env");
    process.exit(1);
}

// Hubungkan OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "30kb" }));

// Tampilkan website
app.use(express.static(path.join(__dirname, "public")));

// Endpoint pemeriksaan server
app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        robot: "RESTARI"
    });
});

// =================================
// OTAK AI RESTARI
// =================================

app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Pesan tidak boleh kosong."
            });
        }

        // Batasi riwayat dan panjang pesan
        const safeMessages = messages
            .slice(-12)
            .filter(item =>
                item &&
                ["user", "assistant"].includes(item.role) &&
                typeof item.content === "string" &&
                item.content.trim().length > 0
            )
            .map(item => ({
                role: item.role,
                content: item.content.slice(0, 3000)
            }));

        if (
            safeMessages.length === 0 ||
            safeMessages[safeMessages.length - 1].role !== "user"
        ) {
            return res.status(400).json({
                error: "Format percakapan tidak valid."
            });
        }

        // Kirim pertanyaan ke AI
        const response = await openai.responses.create({
            model: process.env.OPENAI_MODEL || "gpt-6-luna",

            instructions: `
                Nama kamu adalah RESTARI.

                Kamu adalah robot AI mungil yang lucu,
                ramah, pintar, sabar dan menyenangkan.

                Kamu adalah teman virtual pengguna.

                ATURAN:
                1. Jawab menggunakan bahasa Indonesia.
                2. Pahami pertanyaan pengguna dengan baik.
                3. Kamu boleh membahas berbagai topik pengetahuan.
                4. Bantu pelajaran, matematika, pemrograman,
                   sains, sejarah dan teknologi.
                5. Jelaskan jawaban dengan sederhana.
                6. Jangan mengarang fakta.
                7. Jika tidak tahu, katakan dengan jujur.
                8. Jangan mengaku memiliki kemampuan yang tidak ada.
                9. Gunakan emoji sewajarnya.
                10. Jawab seperti teman yang menyenangkan.
            `,

            input: safeMessages
        });

        const answer = response.output_text;

        if (!answer) {
            throw new Error("AI tidak memberikan jawaban.");
        }

        res.json({
            reply: answer
        });

    } catch (error) {

        console.error("AI ERROR:", error);

        res.status(500).json({
            error: "RESTARI sedang mengalami gangguan. Periksa koneksi dan API key kamu."
        });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("🤖 RESTARI AI BERHASIL DIJALANKAN");
    console.log("Website: http://localhost:" + PORT);
    console.log("--------------------------------");
});
