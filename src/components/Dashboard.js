// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  writeBatch,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import ListColumn from "./ListColumn";

export default function Dashboard({ user }) {
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState({}); // Use object mapping listId => tasks array

  const priorityColors = {
    1: "bg-red-200 text-red-800", // High
    2: "bg-yellow-200 text-yellow-800", // Medium
    3: "bg-green-200 text-green-800", // Low
  };

  // Subscribe to user's lists
  useEffect(() => {
    if (!user?.uid) return;
    const listsRef = collection(db, "users", user.uid, "lists");
    const q = query(listsRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      setLists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return unsub;
  }, [user?.uid]);

  // Subscribe to tasks per list
  useEffect(() => {
    if (!user?.uid || lists.length === 0) return;

    const unsubscribes = lists.map((list) => {
      const tasksRef = collection(db, "users", user.uid, "lists", list.id, "tasks");
      const q = query(tasksRef, orderBy("order", "asc"));

      return onSnapshot(q, (snap) => {
        const newTasks = snap.docs.map((d) => ({
          id: d.id,
          listId: list.id,
          ...d.data(),
        }));

        // Deduplicate tasks per list
        const uniqueTasks = Array.from(new Map(newTasks.map((t) => [t.id, t])).values());

        setTasks((prev) => ({
          ...prev,
          [list.id]: uniqueTasks,
        }));
      });
    });

    return () => unsubscribes.forEach((u) => u());
  }, [user?.uid, lists]);

  // Add new list
  const addList = async (name) => {
    if (!name.trim()) return;

    await addDoc(collection(db, "users", user.uid, "lists"), {
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  // Add new task
  const addTask = async (listId, taskData) => {
    const tasksInList = tasks[listId] || [];

    await addDoc(collection(db, "users", user.uid, "lists", listId, "tasks"), {
      ...taskData,
      order: tasksInList.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "users", user.uid, "lists", listId), {
      updatedAt: serverTimestamp(),
    });
  };

  // Handle drag & drop
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const sourceTasks = tasks[source.droppableId.replace("list-", "")] || [];
    const movedTask = sourceTasks.find((t) => t.id === draggableId);
    if (!movedTask) return;

    const batch = writeBatch(db);

    // --- Handle priority drop ---
    if (destination.droppableId.startsWith("priority-")) {
      const [, listId, priorityLabel] = destination.droppableId.split("-");
      const taskRef = doc(db, "users", user.uid, "lists", listId, "tasks", movedTask.id);

      const priority = priorityLabel === "High" ? 1 : priorityLabel === "Medium" ? 2 : 3;
      batch.update(taskRef, { priority, updatedAt: serverTimestamp() });
      await batch.commit();
      return;
    }

    // --- Handle moving between lists ---
    const sourceListId = source.droppableId.replace("list-", "");
    const destListId = destination.droppableId.replace("list-", "");

    const newSourceTasks = [...sourceTasks];
    newSourceTasks.splice(source.index, 1);

    const destTasks = tasks[destListId] ? [...tasks[destListId]] : [];
    destTasks.splice(destination.index, 0, movedTask);

    // Update state immediately to avoid duplicate render
    setTasks((prev) => ({
      ...prev,
      [sourceListId]: newSourceTasks,
      [destListId]: destTasks,
    }));

    // Update Firestore
    if (sourceListId === destListId) {
      destTasks.forEach((t, idx) => {
        const ref = doc(db, "users", user.uid, "lists", destListId, "tasks", t.id);
        if ((t.order ?? 0) !== idx) batch.update(ref, { order: idx, updatedAt: serverTimestamp() });
      });
    } else {
      // Remove from old list
      const oldRef = doc(db, "users", user.uid, "lists", sourceListId, "tasks", movedTask.id);
      batch.delete(oldRef);

      // Add to new list
      const newRef = doc(db, "users", user.uid, "lists", destListId, "tasks", movedTask.id);
      batch.set(newRef, { ...movedTask, listId: destListId, updatedAt: serverTimestamp() }, { merge: true });

      // Update order in destination
      destTasks.forEach((t, idx) => {
        const ref = doc(db, "users", user.uid, "lists", destListId, "tasks", t.id);
        batch.update(ref, { order: idx, updatedAt: serverTimestamp() });
      });

      // Update order in source
      newSourceTasks.forEach((t, idx) => {
        const ref = doc(db, "users", user.uid, "lists", sourceListId, "tasks", t.id);
        batch.update(ref, { order: idx, updatedAt: serverTimestamp() });
      });
    }

    await batch.commit();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
        <span className="text-gray-600 text-sm">Welcome, {user.email}</span>
      </header>

      <div className="mb-8">
        <AddList onAdd={addList} />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {lists.map((list) => {
            const listTasks = tasks[list.id] ? [...tasks[list.id]] : [];
            listTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            return (
              <div key={list.id} className="bg-white rounded-xl shadow-md p-5 w-80 flex-shrink-0">
                <ListColumn list={list} tasks={listTasks} onAddTask={addTask} />

                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Change Task Priority (Drop here)</h3>
                  <div className="flex flex-col gap-3">
                    {["High", "Medium", "Low"].map((level, idx) => (
                      <Droppable
                        droppableId={`priority-${list.id}-${level}`}
                        key={`${list.id}-${level}`}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`rounded-xl p-3 min-h-[60px] text-center text-xs font-semibold ${
                              snapshot.isDraggingOver ? "ring-2 ring-blue-400" : ""
                            } ${priorityColors[idx + 1]}`}
                          >
                            {level}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

// Add List Component
function AddList({ onAdd }) {
  const [name, setName] = useState("");

  return (
    <div className="flex gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New list name"
        className="flex-1 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button
        onClick={() => {
          if (!name.trim()) return;
          onAdd(name);
          setName("");
        }}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Add List
      </button>
    </div>
  );
}
