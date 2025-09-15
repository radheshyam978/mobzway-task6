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
} from "firebase/firestore";
import { db } from "../firebase";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import ListColumn from "./ListColumn";

export default function Dashboard({ user }) {
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);

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

  // Subscribe to tasks for each list
  useEffect(() => {
    if (!user?.uid || lists.length === 0) return;

    const unsubscribes = lists.map((list) => {
      const tasksRef = collection(db, "users", user.uid, "lists", list.id, "tasks");
      const q = query(tasksRef, orderBy("order", "asc"));

      return onSnapshot(q, (snap) => {
        setTasks((prev) => [
          ...prev.filter((t) => t.listId !== list.id),
          ...snap.docs.map((d) => ({ id: d.id, listId: list.id, ...d.data() })),
        ]);
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
    const tasksInList = tasks.filter((t) => t.listId === listId);
    const priority = taskData.priority ?? 3; // default Low

    await addDoc(collection(db, "users", user.uid, "lists", listId, "tasks"), {
      ...taskData,
      priority,
      order: tasksInList.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const listRef = doc(db, "users", user.uid, "lists", listId);
    await writeBatch(db).set(listRef, { updatedAt: serverTimestamp() }, { merge: true });
  };

  // Handle drag & drop
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const movedTask = tasks.find((t) => t.id === draggableId);
    if (!movedTask) return;

    const batch = writeBatch(db);

    // --- Priority drop ---
    if (destination.droppableId.startsWith("priority-")) {
      const [, listId, priorityLabel] = destination.droppableId.split("-");
      const taskRef = doc(db, "users", user.uid, "lists", listId, "tasks", movedTask.id);
      const priority = priorityLabel === "High" ? 1 : priorityLabel === "Medium" ? 2 : 3;

      batch.set(taskRef, { priority, updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
      return;
    }

    // --- Moving tasks within/between lists ---
    const sourceListId = source.droppableId.replace("list-", "");
    const destListId = destination.droppableId.replace("list-", "");

    const sourceTasks = tasks.filter((t) => t.listId === sourceListId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const destTasks = tasks.filter((t) => t.listId === destListId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Remove from source
    const indexInSource = sourceTasks.findIndex((t) => t.id === draggableId);
    if (indexInSource !== -1) sourceTasks.splice(indexInSource, 1);

    // Add to destination
    destTasks.splice(destination.index, 0, movedTask);

    // Update orders in destination
    destTasks.forEach((t, idx) => {
      const ref = doc(db, "users", user.uid, "lists", destListId, "tasks", t.id);
      batch.set(ref, { ...t, order: idx, listId: destListId, updatedAt: serverTimestamp() }, { merge: true });
    });

    // Update orders in source (if different list)
    if (sourceListId !== destListId) {
      sourceTasks.forEach((t, idx) => {
        const ref = doc(db, "users", user.uid, "lists", sourceListId, "tasks", t.id);
        batch.set(ref, { ...t, order: idx, updatedAt: serverTimestamp() }, { merge: true });
      });
    }

    // Update lists timestamp
    batch.set(doc(db, "users", user.uid, "lists", sourceListId), { updatedAt: serverTimestamp() }, { merge: true });
    batch.set(doc(db, "users", user.uid, "lists", destListId), { updatedAt: serverTimestamp() }, { merge: true });

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
            const listTasks = tasks
              .filter((t) => t.listId === list.id)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            return (
              <div key={list.id} className="bg-white rounded-xl shadow-md p-5 w-80 flex-shrink-0">
                <ListColumn list={list} tasks={listTasks} onAddTask={addTask} />

                {/* Priority Drop Zones */}
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Change Task Priority (Drop here)</h3>
                  <div className="flex flex-col gap-3">
                    {["High", "Medium", "Low"].map((level, idx) => (
                      <Droppable droppableId={`priority-${list.id}-${level}`} key={`${list.id}-${level}`}>
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
