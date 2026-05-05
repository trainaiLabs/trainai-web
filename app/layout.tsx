import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrainAI - AI를 가르치고 보상받으세요",
  description:
    "AI 답변을 평가하고 포인트를 적립하세요. 적립된 포인트는 출금 신청을 통해 보상받을 수 있습니다.",
  openGraph: {
    title: "TrainAI - AI를 가르치고 보상받으세요",
    description:
      "간단한 퀘스트로 AI 학습에 참여하고 포인트를 적립하세요. 출금 신청으로 보상받을 수 있습니다.",
    url: "https://trainai.co.kr",
    siteName: "TrainAI",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrainAI - AI를 가르치고 보상받으세요",
    description:
      "간단한 퀘스트로 AI 학습에 참여하고 포인트를 적립하세요. 출금 신청으로 보상받을 수 있습니다.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
        lang="ko"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
