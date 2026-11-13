
// ==========================================
// Restari AI - JAVASCRIPT UTAMA
// ==========================================

// Mengambil elemen HTML
const robot = document.getElementById("robot");
const statusText = document.getElementById("status");
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");

const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");
const stopButton = document.getElementById("stopButton");
const clearButton = document.getElementById("clearButton");

// Variabel utama
let history = [];
let recognition = null;
let isListening = false;
let isThinking = false;
let speechId = 0;

// ==========================================
// MEMBERSIHKAN TEKS UNTUK SUARA
// ==========================================

function bersihkanTeksSuara(teks) {
    return String(teks)
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        .replace(/~~(.*?)~~/g, "$1")
        .replace(/^\s*#{1,6}\s*/gm, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_~#]/g, "")
        .replace(/https?:\/\/\S+/g, "tautan")
        .replace(/\s+/g, " ")
        .trim();
}

// ==========================================
// MENAMPILKAN PESAN CHAT
// ==========================================

function addMessage(teks, pengirim) {
    const message = document.createElement("div");
    message.className = "message " + pengirim;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = pengirim === "bot" ? "🤖" : "👤";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = teks;

    message.appendChild(avatar);
    message.appendChild(bubble);

    chatBox.appendChild(message);

    chatBox.scrollTop = chatBox.scrollHeight;

    return message;
}

// ==========================================
// ROBOT BERBICARA
// ==========================================

function speak(teks) {
    if (!("speechSynthesis" in window)) {
        statusText.textContent = "Browser tidak mendukung suara.";
        return;
    }

    const teksBersih = bersihkanTeksSuara(teks)
    .replace(/\bRESTARI\b/gi, "Restari");

    if (!teksBersih) return;

    window.speechSynthesis.cancel();

    const id = ++speechId;

    const suara = new SpeechSynthesisUtterance(teksBersih);

    suara.lang = "id-ID";
    suara.rate = 0.95;
    suara.pitch = 1.15;
    suara.volume = 1;

    const daftarSuara = window.speechSynthesis.getVoices();

    const suaraIndonesia = daftarSuara.find(
        item => item.lang.toLowerCase().startsWith("id")
    );

    if (suaraIndonesia) {
        suara.voice = suaraIndonesia;
    }

    suara.onstart = function() {
        if (id !== speechId) return;

        robot.classList.add("speaking");
        statusText.textContent = "Restari sedang berbicara... 🔊";
    };

    suara.onend = function() {
        if (id !== speechId) return;

        robot.classList.remove("speaking");
        statusText.textContent = "Restari siap ngobrol lagi ❤️";
    };

    suara.onerror = function() {
        if (id !== speechId) return;

        robot.classList.remove("speaking");
        statusText.textContent = "Restari siap ngobrol lagi ❤️";
    };

    window.speechSynthesis.speak(suara);
}

// ==========================================
// MENGHUBUNGKAN KE OTAK AI
// ==========================================

async function askRestari() {
    const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            messages: history
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error || "Restari gagal menghubungi AI."
        );
    }

    if (!data.reply) {
        throw new Error("AI tidak memberikan jawaban.");
    }

    return data.reply;
}

// ==========================================
// MENGIRIM PESAN KE AI
// ==========================================

async function sendMessage(teks = null) {
    const pesan = (
        teks !== null ? teks : userInput.value
    ).trim();

    if (!pesan || isThinking) return;

    if (pesan.length > 3000) {
        alert("Pesan maksimal 3000 karakter.");
        return;
    }

    isThinking = true;
    sendButton.disabled = true;

    userInput.value = "";

    addMessage(pesan, "user");

    history.push({
        role: "user",
        content: pesan
    });

    statusText.textContent = "Restari sedang berpikir... 🧠";

    const loading = addMessage(
        "Sebentar ya, aku sedang berpikir... ✨",
        "bot"
    );

    try {
        // Hubungkan ke server.js
        const jawaban = await askRestari();

        // Tampilkan jawaban AI
        loading.querySelector(".bubble").textContent = jawaban;

        history.push({
            role: "assistant",
            content: jawaban
        });

        // Batasi riwayat percakapan
        history = history.slice(-12);

        // Restari membacakan jawaban
        speak(jawaban);

    } catch (error) {
        console.error("Restari ERROR:", error);

        // Batalkan pesan user yang gagal dikirim
        history.pop();

        loading.querySelector(".bubble").textContent =
            "Maaf, Restari sedang mengalami gangguan: " +
            error.message;

        statusText.textContent = "Koneksi AI bermasalah 😢";

    } finally {
        isThinking = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// ==========================================
// TOMBOL KIRIM CHAT
// ==========================================

sendButton.addEventListener("click", function() {
    sendMessage();
});

userInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// ==========================================
// FITUR MIKROFON
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        isListening = true;

        robot.classList.add("listening");

        statusText.textContent =
            "Restari sedang mendengarkanmu... 🎤";

        voiceButton.textContent = "🎙️ Mendengarkan...";
    };

    recognition.onresult = function(event) {
        const hasil =
            event.results[0][0].transcript;

        userInput.value = hasil;

        sendMessage(hasil);
    };

    recognition.onerror = function(event) {
        console.error("MIC ERROR:", event.error);

        if (event.error === "not-allowed") {
            statusText.textContent =
                "Izinkan akses mikrofon di browser.";
        } else if (event.error === "no-speech") {
            statusText.textContent =
                "Restari belum mendengar suara kamu.";
        } else {
            statusText.textContent =
                "Mikrofon mengalami gangguan.";
        }
    };

    recognition.onend = function() {
        isListening = false;

        robot.classList.remove("listening");

        voiceButton.textContent = "🎤 Bicara";

        if (!isThinking) {
            statusText.textContent =
                "Restari siap ngobrol lagi ❤️";
        }
    };

} else {
    voiceButton.disabled = true;
    voiceButton.textContent = "Mikrofon tidak didukung";
}

// ==========================================
// TOMBOL MIKROFON
// ==========================================

voiceButton.addEventListener("click", function() {
    if (!recognition) {
        alert("Gunakan Google Chrome untuk mikrofon.");
        return;
    }

    if (isListening || isThinking) return;

    window.speechSynthesis.cancel();

    try {
        recognition.start();
    } catch (error) {
        console.error(error);
    }
});

// ==========================================
// TOMBOL HENTIKAN SUARA
// ==========================================

stopButton.addEventListener("click", function() {
    speechId++;

    window.speechSynthesis.cancel();

    if (recognition && isListening) {
        recognition.stop();
    }

    robot.classList.remove("speaking");
    robot.classList.remove("listening");

    statusText.textContent = "Restari sedang diam 🤫";
});

// ==========================================
// TOMBOL HAPUS CHAT
// ==========================================

clearButton.addEventListener("click", function() {
    speechId++;

    window.speechSynthesis.cancel();

    if (recognition && isListening) {
        recognition.stop();
    }

    history = [];

    chatBox.innerHTML = "";

    addMessage(
        "Halo lagi! Aku Restari. Yuk mulai obrolan baru! ❤️",
        "bot"
    );

    statusText.textContent = "Restari siap ngobrol!";
});

// ==========================================
// SELESAI
// ==========================================

console.log("🤖 Restari AI berhasil dimuat!");
