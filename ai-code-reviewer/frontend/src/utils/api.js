/**
 * api.js — Axios wrapper for backend communication.
 */
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const client = axios.create({ baseURL: BASE_URL, timeout: 60_000 });

/** Analyze raw code snippet */
export async function analyzeCode(code) {
  const { data } = await client.post("/analyze", { code });
  return data;
}

/** Analyze a public GitHub repository */
export async function analyzeGitHub(repo_url) {
  const { data } = await client.post("/analyze-github", { repo_url });
  return data;
}

/** Health check — also tells us if AI is enabled */
export async function healthCheck() {
  const { data } = await client.get("/health");
  return data;
}
