"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n";

const Redirect = () => {
    const t = useT();

    useEffect(() => {
        // Forward everything Bungie sent back (code, state...) to the login page
        window.location.replace(`/login${window.location.search}`);
    }, []);

    return <div>{t.login.redirecting}</div>;
};

export default Redirect;
