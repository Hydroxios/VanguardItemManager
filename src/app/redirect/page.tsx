"use client";

import { useEffect } from "react";

const Redirect = () => {

    useEffect(() => {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code") || "";
        if (code) {
            window.location.href = `${window.location.origin}/login?code=${encodeURIComponent(code)}`;
        }
    }, []);

    return <div>Redirecting...</div>;
};

export default Redirect;
