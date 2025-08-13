"use client";

import dynamic from "next/dynamic";

const ShareActions = dynamic(() => import("./share-actions"), {
  ssr: false,
  loading: () => null,
});

export default ShareActions;
