"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface CivicSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
}

interface CivicSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<CivicSpeechRecognitionResult>;
}

interface CivicSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: CivicSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type CivicSpeechRecognitionConstructor = new () => CivicSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: CivicSpeechRecognitionConstructor;
    webkitSpeechRecognition?: CivicSpeechRecognitionConstructor;
  }
}

export default function ReportPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<CivicSpeechRecognition | null>(null);
  const sessionTranscriptRef = useRef("");
  const committedSessionTranscriptRef = useRef("");

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const handleMicrophoneClick = () => {
    if (isListening) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const SpeechRecognitionConstructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setError(
        "Speech-to-text is not supported in this browser. Please use Chrome or another supported browser."
      );
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    sessionTranscriptRef.current = "";
    committedSessionTranscriptRef.current = "";

    recognition.onresult = (event) => {
      const resultEntries = Array.from(event.results);
      const completeTranscript = resultEntries
        .map((result) => result[0]?.transcript.trim() ?? "")
        .filter(Boolean)
        .join(" ");

      sessionTranscriptRef.current = completeTranscript;

      if (!resultEntries.some((result) => result.isFinal) || !completeTranscript) {
        return;
      }

      const committedTranscript = committedSessionTranscriptRef.current;
      if (!completeTranscript.startsWith(committedTranscript)) {
        return;
      }

      const transcriptToAppend = completeTranscript
        .slice(committedTranscript.length)
        .trimStart();

      if (!transcriptToAppend) {
        return;
      }

      committedSessionTranscriptRef.current = completeTranscript;
      setDescription((previousDescription) => {
        const separator = previousDescription.trim() ? " " : "";
        return previousDescription + separator + transcriptToAppend;
      });
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setIsListening(false);
      }

      if (
        event.error === "not-allowed" ||
        event.error === "permission-denied" ||
        event.error === "service-not-allowed"
      ) {
        setError(
          "Microphone permission was denied. Please allow microphone access and try again."
        );
      } else if (event.error === "no-speech") {
        setError("No speech was detected. Please try again or type your description.");
      } else if (event.error === "audio-capture") {
        setError("No microphone was found. Please connect a microphone and try again.");
      } else if (event.error === "network") {
        setError("Speech recognition network error. Please try again or type your description.");
      } else if (event.error !== "aborted") {
        setError("Speech recognition failed. Please try again or type your description.");
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setError("");
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("Unable to start speech recognition. Please try again or type your description.");
    }
  };

  const handleSubmit = () => {
    setError("");

    if (!description.trim()) {
      setError("Please describe the problem.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter the location.");
      return;
    }

    console.log("📷 SELECTED PHOTO:", photo);
    console.log("📷 PHOTO NAME:", photo?.name);
    console.log("📷 PHOTO SIZE:", photo?.size);

    // No photo
    if (!photo) {
      console.log("ℹ️ No photo selected.");

      const report = {
        description: description.trim(),
        category,
        location: location.trim(),
        photo: null,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "civicpulse_report",
        JSON.stringify(report)
      );

      window.location.href = "/analyze";
      return;
    }

    // Convert image to Base64
    const reader = new FileReader();

    reader.onload = () => {
      const base64Photo = reader.result;

      console.log("📷 BASE64 PHOTO CREATED");
      console.log(
        "📷 BASE64 LENGTH:",
        typeof base64Photo === "string"
          ? base64Photo.length
          : 0
      );

      const report = {
        description: description.trim(),
        category,
        location: location.trim(),
        photo: base64Photo,
        photoName: photo.name,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "civicpulse_report",
        JSON.stringify(report)
      );

      console.log("✅ REPORT WITH PHOTO SAVED TO LOCALSTORAGE");

      window.location.href = "/analyze";
    };

    reader.onerror = () => {
      console.error("❌ FILE READER ERROR");
      setError("Failed to process the photo. Please try again.");
    };

    reader.readAsDataURL(photo);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

          <a href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 font-bold text-xl">
              C
            </div>

            <div>
              <h1 className="text-xl font-bold">
                CivicPulse <span className="text-blue-400">AI</span>
              </h1>

              <p className="text-xs text-slate-400">
                Infrastructure Intelligence
              </p>
            </div>
          </a>

          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← Go Back
          </button>

        </div>
      </nav>

      {/* Report Form */}
      <section className="mx-auto max-w-3xl px-6 py-16">

        <div className="mb-10 text-center">

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl">
            📍
          </div>

          <h2 className="text-4xl font-bold">
            Report an Infrastructure Issue
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Tell us about a problem affecting your community.
            CivicPulse AI will analyze your report and help identify
            development priorities.
          </p>

        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">

          {/* Description */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-sm font-semibold">
                What problem are you facing?
              </label>

              <div className="flex items-center gap-2">
                {isListening && (
                  <span className="text-xs font-medium text-red-300">
                    Listening... Start speaking
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleMicrophoneClick}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    isListening
                      ? "border-red-400 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                      : "border-white/20 bg-slate-900 text-white hover:border-blue-400 hover:bg-blue-500/10"
                  }`}
                  title={isListening ? "Stop listening" : "Start speech-to-text"}
                  aria-label={isListening ? "Stop speech-to-text" : "Start speech-to-text"}
                  aria-pressed={isListening}
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
                  </svg>
                </button>
              </div>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: There has been no regular water supply in our village for the last six months..."
              rows={6}
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              You can write in English, Hindi, Marathi, or another Indian
              language.
            </p>
          </div>

          {/* Category */}
          <div className="mt-7">
            <label className="mb-3 block text-sm font-semibold">
              What type of issue is this?
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-4 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">Select a category</option>

              <option value="water">
                💧 Water & Sanitation
              </option>

              <option value="roads">
                🛣️ Roads & Transportation
              </option>

              <option value="healthcare">
                🏥 Healthcare Infrastructure
              </option>

              <option value="education">
                🏫 Education Infrastructure
              </option>

              <option value="utilities">
                ⚡ Public Utilities
              </option>
            </select>
          </div>

          {/* Location */}
          <div className="mt-7">
            <label className="mb-3 block text-sm font-semibold">
              Where is the problem?
            </label>

            <div className="flex gap-3">

              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter village, city, district..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) {
                    setError(
                      "Location services are not supported by your browser."
                    );
                    return;
                  }

                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const latitude =
                        position.coords.latitude;

                      const longitude =
                        position.coords.longitude;

                      setLocation(
                        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                      );

                      setError("");
                    },
                    () => {
                      setError(
                        "Unable to access your location. Please enter it manually."
                      );
                    }
                  );
                }}
                className="rounded-xl border border-white/10 px-4 text-sm transition hover:bg-white/10"
                title="Use my location"
              >
                📍
              </button>

            </div>
          </div>

          {/* Photo */}
          <div className="mt-7">

            <label className="mb-3 block text-sm font-semibold">
              Add a photo{" "}
              <span className="font-normal text-slate-500">
                (optional)
              </span>
            </label>

            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-900 px-5 py-8 text-center transition hover:border-blue-500/50">

              <div>

                <div className="text-2xl">
                  📷
                </div>

                <p className="mt-2 text-sm font-medium">
                  {photo
                    ? photo.name
                    : "Upload a photo"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG up to 5MB
                </p>

              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const selectedFile =
                    e.target.files?.[0];

                  if (!selectedFile) return;

                  if (
                    selectedFile.size >
                    5 * 1024 * 1024
                  ) {
                    setError(
                      "Photo must be smaller than 5MB."
                    );
                    return;
                  }

                  console.log(
                    "📷 PHOTO SELECTED:",
                    selectedFile.name
                  );

                  setPhoto(selectedFile);
                  setError("");
                }}
              />

            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-8 w-full rounded-xl bg-blue-500 px-6 py-4 font-semibold transition hover:bg-blue-400"
          >
            Analyze Report →
          </button>

        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Your report helps CivicPulse understand infrastructure needs
          across communities. AI analysis will be used to structure and
          prioritize development requests.
        </p>

      </section>

    </main>
  );
}
