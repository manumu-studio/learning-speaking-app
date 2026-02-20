// Launch page — Server component with metadata for the LSA launch event landing page
import type { Metadata } from "next";
import LaunchContent from "./LaunchContent";

export const metadata: Metadata = {
  title: "LSA - MM Studio",
  description:
    "LSA by ManuMu Studio launches February 26, 2026. A new way to learn, speak, and achieve.",
  openGraph: {
    title: "LSA — Coming Soon",
    description: "LSA by ManuMu Studio launches February 26, 2026.",
    type: "website",
  },
};

export default function LaunchPage() {
  return <LaunchContent />;
}
