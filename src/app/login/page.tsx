"use client"

import { useEffect } from "react";

const Login = () => {

  useEffect(() => {
    const urlParam = new URLSearchParams(window.location.search)
    const code = urlParam.get("code")
    if (code) {
    // The code is exchanged server side so the client secret never reaches the browser
    fetch("/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
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
