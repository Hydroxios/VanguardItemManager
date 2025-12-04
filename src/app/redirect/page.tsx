"use client";

import { useEffect } from "react";

const Redirect = () => {

    useEffect(() => {
        const url = new URL(window.location.href);
        console.log(url);
        const code = url.searchParams.get("code") || "";
        console.log(code);
        if (code) {
            window.location.href = `http://localhost:3000/login?code=${code}`;
        }
    }, []);

    return <div>Redirecting...</div>;
};

export default Redirect;