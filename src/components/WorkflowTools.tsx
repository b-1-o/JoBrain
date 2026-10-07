"use client";

import { CalendarPlus, Download, Bell } from "lucide-react";
import { toast } from "sonner";

const base = "/api/applications/export";

export default function WorkflowTools() {
  return (
    <div className="jb-autofill-actions">
      <a className="jb-button jb-button-ghost" href={base + "?format=csv"} download="jobrain-applications.csv">
        <Download size={14} />
        Export CSV
      </a>
      <a className="jb-button jb-button-ghost" href={base + "?format=ics"} download="jobrain-calendar.ics">
        <CalendarPlus size={14} />
        Calendar
      </a>
      <button
        type="button"
        className="jb-button jb-button-ghost"
        onClick={() => toast.success("Reminder center is active.")}
      >
        <Bell size={14} />
        Test notification
      </button>
    </div>
  );
}
