"use client";

import { FormEvent, useState } from "react";
import { Mail, MessageSquare, Send, User } from "lucide-react";

type FormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const initialValues: FormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [formValues, setFormValues] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const updateField = (field: keyof FormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setError("");
    setStatus("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (Object.values(formValues).some((value) => !value.trim())) {
      setError("Please complete all fields before submitting.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);
    setStatus(
      "Your message is ready to send. Contact submission is not configured yet, so no message was sent."
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-12 md:py-20">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F4512C]">
            We&apos;re here to help
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111111] md:text-5xl">
            Contact Us
          </h1>
          <p className="mt-4 text-sm leading-6 text-gray-500 md:text-base">
            Have a question about an order, a product, or your Classic Threads
            experience? Send us a message and our support team will be happy to help.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="space-y-4">
            <div className="rounded-3xl border border-[#E6E6E3] bg-white p-7 shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF3F0] text-[#F4512C]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-[#111111]">Customer support</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Share the details of your request using the form. Include your order
                information where relevant so we can understand how to help.
              </p>
            </div>
            <div className="rounded-3xl border border-[#E6E6E3] bg-[#111111] p-7 text-white">
              <Mail className="mb-4 h-5 w-5 text-[#F4512C]" />
              <h2 className="text-lg font-bold">Tell us what you need</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                We value every question and suggestion. A clear subject and message
                help us point you in the right direction faster.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-[#E6E6E3] bg-white p-6 shadow-sm md:p-8"
          >
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600"
              >
                {error}
              </div>
            )}
            {status && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium leading-5 text-emerald-700"
              >
                {status}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs font-bold text-[#111111]">
                Name
                <span className="relative mt-2 block">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formValues.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-[#E6E6E3] bg-[#F7F7F5] px-4 py-3 pl-10 text-xs font-normal text-[#111111] outline-none placeholder:text-gray-400 focus:border-[#F4512C]"
                    required
                  />
                </span>
              </label>

              <label className="text-xs font-bold text-[#111111]">
                Email
                <span className="relative mt-2 block">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formValues.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#E6E6E3] bg-[#F7F7F5] px-4 py-3 pl-10 text-xs font-normal text-[#111111] outline-none placeholder:text-gray-400 focus:border-[#F4512C]"
                    required
                  />
                </span>
              </label>
            </div>

            <label className="mt-5 block text-xs font-bold text-[#111111]">
              Subject
              <input
                type="text"
                name="subject"
                value={formValues.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="How can we help?"
                className="mt-2 w-full rounded-xl border border-[#E6E6E3] bg-[#F7F7F5] px-4 py-3 text-xs font-normal text-[#111111] outline-none placeholder:text-gray-400 focus:border-[#F4512C]"
                required
              />
            </label>

            <label className="mt-5 block text-xs font-bold text-[#111111]">
              Message
              <textarea
                name="message"
                value={formValues.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Write your message here..."
                rows={6}
                className="mt-2 w-full resize-y rounded-xl border border-[#E6E6E3] bg-[#F7F7F5] px-4 py-3 text-xs font-normal leading-5 text-[#111111] outline-none placeholder:text-gray-400 focus:border-[#F4512C]"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4512C] py-3.5 text-xs font-bold text-white transition-colors hover:bg-[#DD3F1E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Preparing message..." : "Submit Message"}
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
