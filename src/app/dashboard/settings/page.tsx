import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2">Settings</h1>
                <p className="text-[#63534B]">Configure your workspace, security, and AI models.</p>
            </div>

            <div className="bg-white border border-[#D8D2C8] rounded-xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[#EEEDE4] rounded-full flex items-center justify-center mb-6">
                    <Settings className="w-8 h-8 text-[#63534B]" />
                </div>
                <h3 className="text-xl font-serif text-[#1F1D1A] mb-2">Workspace Settings</h3>
                <p className="text-[#63534B] max-w-md">
                    Adjust compliance settings, update language preferences, and manage API keys for external models.
                </p>
            </div>
        </div>
    );
}
