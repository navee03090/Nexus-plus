"use client";

import React, { useState } from "react";
import { User, GraduationCap, MapPin, Tag, CheckCircle2, Save, Sparkles } from "lucide-react";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("Muhammad Naveed");
  const [educationLevel, setEducationLevel] = useState("undergraduate");
  const [university, setUniversity] = useState("UET Peshawar (University of Engineering and Technology)");
  const [fieldOfStudy, setFieldOfStudy] = useState("Computer Systems Engineering");
  const [semester, setSemester] = useState("6th Semester");
  const [city, setCity] = useState("Peshawar");
  const [interests, setInterests] = useState<string[]>([
    "Artificial Intelligence",
    "Cybersecurity",
    "Hackathons",
    "DeepTech",
    "Startups",
    "Research Grants",
  ]);
  const [saved, setSaved] = useState(false);

  const availableInterests = [
    "Artificial Intelligence",
    "Cybersecurity",
    "Cloud Computing",
    "Hackathons",
    "DeepTech",
    "Startups",
    "Robotics",
    "Biotechnology",
    "Research Grants",
    "Scholarships",
    "Internships",
    "Conferences",
    "Web3 & Blockchain",
  ];

  const toggleInterest = (tag: string) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((i) => i !== tag));
    } else {
      setInterests([...interests, tag]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-np-accent font-semibold mb-2">
          <User className="w-4 h-4" />
          <span>Profile & Eligibility Criteria</span>
        </div>
        <h1 className="text-3xl font-extrabold text-np-text tracking-tight">
          Academic & Personal Profile
        </h1>
        <p className="text-sm text-np-muted mt-1">
          Nexus Pulse computes transparent match scores and eligibility checks based on this information.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-np-lg bg-np-verify/10 border border-np-verify/40 text-np-verify text-xs flex items-center gap-2.5 mb-6 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-np-verify shrink-0" />
          <span>Profile saved successfully! Your personalized recommendations have been recomputed.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Academic Details Card */}
        <div className="p-6 sm:p-8 rounded-np-lg bg-np-surface border border-np-border space-y-6">
          <h2 className="text-base font-bold text-np-text flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-np-accent" />
            <span>Academic Background</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2.5 text-xs text-np-text focus:outline-none focus:border-np-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">
                Current Level of Education
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-np-accent"
              >
                <option value="undergraduate">Undergraduate Student (BS / BE)</option>
                <option value="graduate">Graduate Student (MS / MPhil)</option>
                <option value="phd">PhD Scholar</option>
                <option value="postdoc">Postdoctoral Researcher</option>
                <option value="professional">Early-Career Professional</option>
                <option value="faculty">Academic Faculty / Professor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">
                University / Institution
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2.5 text-xs text-np-text focus:outline-none focus:border-np-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">
                Department / Discipline
              </label>
              <input
                type="text"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2.5 text-xs text-np-text focus:outline-none focus:border-np-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">
                Current Semester / Standing
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2.5 text-xs text-np-text focus:outline-none focus:border-np-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">
                Primary City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-np-bg border border-np-border rounded-xl px-3 py-2.5 text-xs text-np-text focus:outline-none focus:border-np-accent"
                required
              />
            </div>
          </div>
        </div>

        {/* Technical Interests & Opportunities of Interest */}
        <div className="p-6 sm:p-8 rounded-np-lg bg-np-surface border border-np-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-np-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-np-accent" />
              <span>Interests & Opportunity Preferences</span>
            </h2>
            <span className="text-xs text-np-muted">{interests.length} selected</span>
          </div>

          <p className="text-xs text-np-muted">
            Select the domains and event categories you want the personalization engine to prioritize.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {availableInterests.map((tag) => {
              const selected = interests.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleInterest(tag)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selected
                      ? "bg-np-accent text-white shadow-md shadow-np border border-np-accent/40"
                      : "bg-np-bg text-np-muted hover:text-np-text border border-np-border hover:border-np-border-strong"
                  }`}
                >
                  {tag} {selected && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-np-accent hover:bg-[#5a9dff] text-white font-semibold text-xs sm:text-sm transition-colors shadow-lg shadow-np"
          >
            <Save className="w-4 h-4" />
            <span>Update Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
}
