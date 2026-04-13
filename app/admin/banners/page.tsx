"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  MdAddPhotoAlternate,
  MdCheckCircle,
  MdDelete,
  MdImage,
  MdRefresh,
  MdSave,
} from "react-icons/md";
import {
  DEFAULT_HOME_BANNERS,
  readHomeBanners,
  resetHomeBanners,
  writeHomeBanners,
  type HomeBannerSlide,
} from "@/lib/home-banners";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<HomeBannerSlide[]>(DEFAULT_HOME_BANNERS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBanners(readHomeBanners());
  }, []);

  function handleFileChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        return;
      }

      setBanners((current) => current.map((banner, bannerIndex) => (
        bannerIndex === index
          ? { ...banner, name: file.name, src: result }
          : banner
      )));
      setSaved(false);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleRemove(index: number) {
    setBanners((current) => current.filter((_, bannerIndex) => bannerIndex !== index));
    setSaved(false);
  }

  function handleAddSlot() {
    setBanners((current) => [
      ...current,
      {
        id: `banner-${Date.now()}`,
        name: `Banner ${current.length + 1}`,
        src: "/banners/banner1.svg",
      },
    ]);
    setSaved(false);
  }

  function handleReset() {
    resetHomeBanners();
    setBanners(DEFAULT_HOME_BANNERS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleSave() {
    writeHomeBanners(banners);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Home Page Banners</h1>
          <p className="mt-1 text-sm text-slate-500">
            Change the dashboard slider banners and upload new images from the admin panel.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <MdRefresh className="h-4 w-4" />
            Reset Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition ${
              saved
                ? "bg-emerald-600 shadow-emerald-600/25"
                : "bg-indigo-600 shadow-indigo-600/25 hover:bg-indigo-700"
            }`}
          >
            {saved ? <MdCheckCircle className="h-4 w-4" /> : <MdSave className="h-4 w-4" />}
            {saved ? "Saved" : "Save Banners"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-300/40">
            <MdImage className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Banner Upload</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Upload images for the dashboard banner carousel. Save after making changes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"
          >
            <div className="relative aspect-[16/5] w-full bg-slate-100">
              <img
                src={banner.src}
                alt={banner.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
                Slide {index + 1}
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-bold text-slate-900">{banner.name}</p>
                <p className="mt-1 text-xs text-slate-500">Recommended wide banner ratio: 16:5</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                  <MdAddPhotoAlternate className="h-4 w-4" />
                  Upload Banner
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange(index, event)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={banners.length === 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdDelete className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddSlot}
        className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
      >
        <MdAddPhotoAlternate className="h-4 w-4" />
        Add Another Banner Slot
      </button>
    </div>
  );
}