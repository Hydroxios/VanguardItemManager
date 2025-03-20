"use client"

import { useEffect } from "react";

const Login = () => {

  useEffect(() => {
    const urlParam = new URLSearchParams(window.location.search)
    const code = urlParam.get("code")
    if (code) {
    fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NODE_ENV === "production" ? "46066" : "45124", // Replace with your actual client_id
        client_secret: process.env.NODE_ENV === "production" ? "MkdPd6spUjiFiPbCKac3ZdMlT0pdDV7ErAZ-9eEfUg8" : "HSNNQvKDJuZZvzmswHAy66ZeS9y3c..tZ6U8keEb.v4", // Replace with your actual client_secret
        grant_type: "authorization_code",
        code: code,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.access_token) {
          localStorage.setItem("token", data.access_token)
          localStorage.setItem("rtoken", data.refresh_token)
          localStorage.setItem("lastUpdate", Date.now().toString())
          window.location.assign("/")
        } else {
          console.error("Failed to retrieve access token:", data);
        }
      })
      .catch((error) => {
        console.error("Error fetching access token:", error);
      });
    }
  }, []);

  return <></>;
};
export default Login;
