"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../lib/api";

import { Category } from "../types/database";

import AddCategoryModal from "../components/categories/AddCategoryModal"; 
import EditCategoryModal from "../components/categories/EditCategoryModal";
import DeleteCategoryModal from "../components/categories/DeleteCategoryModal";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleAddCategory(
    name: string,
    color: string,
    icon: string
  ) {
    try {
      await addCategory(name, color, icon);

      await loadCategories();

      setAddOpen(false);
    } catch (error) {
      console.log(error);
    }
  }

  function handleEdit(category: Category) {
    setSelectedCategory(category);
    setEditOpen(true);
  }

  async function handleSave(
    id: number,
    name: string,
    color: string,
    icon: string
  ) {
    try {
      await updateCategory(
        id,
        name,
        color,
        icon
      );

      await loadCategories();

      setEditOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.log(error);
    }
  }

  function handleDeleteClick(category: Category) {
    setSelectedCategory(category);
    setDeleteOpen(true);
  }

  async function handleDelete(id: number) {
    try {
      await deleteCategory(id);

      await loadCategories();

      setDeleteOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">

      <div className="flex justify-between items-center mb-10">

        <div>

          <h1 className="text-4xl font-bold">
            📂 Kategorier
          </h1>

          <p className="text-zinc-400 mt-2">
            Hantera alla dina kategorier
          </p>

        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="
            flex
            items-center
            gap-2
            bg-green-600
            hover:bg-green-500
            px-5
            py-3
            rounded-xl
            transition
          "
        >
          <Plus size={20} />
          Ny kategori
        </button>

      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">

          <p className="text-zinc-400">
            Antal kategorier
          </p>

          <h2 className="text-4xl font-bold mt-2">
            {categories.length}
          </h2>

        </div>

      </div>

      <div className="space-y-4">

        {categories.map((category) => (

          <div
            key={category.id}
            className="
              flex
              justify-between
              items-center
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-6
            "
          >

            <div className="flex items-center gap-5">

              <span className="text-4xl">
                {category.icon}
              </span>

              <div>

                <h2 className="text-xl font-bold">
                  {category.name}
                </h2>

                <p className="text-zinc-400">
                  {category.color}
                </p>

              </div>

            </div>

            <div className="flex gap-3">

              <button
                onClick={() => handleEdit(category)}
                className="
                  bg-blue-600
                  hover:bg-blue-500
                  px-4
                  py-2
                  rounded-xl
                "
              >
                Redigera
              </button>

              <button
                onClick={() => handleDeleteClick(category)}
                className="
                  bg-red-600
                  hover:bg-red-500
                  px-4
                  py-2
                  rounded-xl
                "
              >
                Ta bort
              </button>

            </div>

          </div>

        ))}

      </div>
            <AddCategoryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAddCategory}
      />

      <EditCategoryModal
        category={selectedCategory}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedCategory(null);
        }}
        onSave={handleSave}
      />

      <DeleteCategoryModal
        category={selectedCategory}
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDelete}
      />

    </main>
  );
}