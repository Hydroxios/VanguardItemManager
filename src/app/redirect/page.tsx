"use client";

import { useEffect } from "react";

const Redirect = () => {

    useEffect(() => {
        // Forward everything Bungie sent back (code, state...) to the login page
        window.location.replace(`/login${window.location.search}`);
    }, []);

    return <div>Redirecting...</div>;
};

export default Redirect;
