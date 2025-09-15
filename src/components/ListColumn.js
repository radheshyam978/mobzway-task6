// src/components/ListColumn.js
import React, { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";

export default function ListColumn({ list, tasks, onAddTask }) {
  return (
    <div className="w-full">
      <h3 className="font-semibold text-lg mb-4 text-gray-700">{list.name}</h3>

      <Droppable droppableId={`list-${list.id}`}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="min-h-[80px] space-y-3"
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(prov) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                  >
                    <TaskCard task={task} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="mt-4">
        <AddTaskForm onAdd={(data) => onAddTask(list.id, data)} />
      </div>
    </div>
  );
}

function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState(2); // default Medium

  const submit = () => {
    if (!title.trim()) return alert("Enter title");

    onAdd({
      title,
      desc,
      dueDate: due ? new Date(due) : null,
      priority: Number(priority),
    });

    setTitle("");
    setDesc("");
    setDue("");
    setPriority(2);
  };

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full border px-2 py-1 rounded"
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description"
        className="w-full border px-2 py-1 rounded"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value={1}>High</option>
          <option value={2}>Medium</option>
          <option value={3}>Low</option>
        </select>
      </div>
      <button
        onClick={submit}
        className="mt-1 px-3 py-1 bg-green-500 text-white rounded"
      >
        Add Task
      </button>
    </div>
  );
}
