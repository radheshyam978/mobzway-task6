// src/components/TaskCard.js
import React from "react";

export default function TaskCard({ task }) {
  // Format Firestore date as dd-mm-yyyy
  const formatDate = (date) => {
    if (!date) return "—";
    try {
      const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return "—";
    }
  };

  const due = formatDate(task.dueDate);

  // Priority styles and text (1=High, 2=Medium, 3=Low)
  const priorityStyles = {
    1: "bg-red-100 text-red-600",
    2: "bg-yellow-100 text-yellow-600",
    3: "bg-green-100 text-green-600",
  };

  const priorityText = {
    1: "High",
    2: "Medium",
    3: "Low",
  };

  // Use task.priority, default to 2 (Medium) if undefined
  const priority = task.priority ?? 2;

  return (
    <div className="bg-white p-3 rounded-lg shadow border hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-gray-800">{task.title}</div>
          <div className="text-xs text-gray-500">{task.desc}</div>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ${priorityStyles[priority]}`}
        >
          {priorityText[priority]}
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-500">Due: {due}</div>
    </div>
  );
}
