"use client";

import { PanelLeft } from "lucide-react";
import { copy } from "@/content/site";
import { IconButton } from "./icon-button";
import { useSidebar } from "./shell-frame";

export function CollapseButton() {
  const { close } = useSidebar();
  return <IconButton icon={PanelLeft} label={copy.sidebar.toggle} onClick={close} built />;
}
