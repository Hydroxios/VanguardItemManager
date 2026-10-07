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
        // The route stored the refresh token in an httpOnly cookie; the home page gets an access token from it
        if (data.access_token) {
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
