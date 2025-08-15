"use client";

import dynamic from "next/dynamic";

const EventsClient = dynamic(() => import("./events-client"), {
  ssr: false,
  loading: () => null,
});

export default EventsClient;
