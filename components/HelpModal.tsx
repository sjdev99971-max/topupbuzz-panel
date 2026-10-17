"use client";
import { useState } from "react";

export default function HelpModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 w-12 h-12 bg-[var(--accent)] text-white rounded-full flex items-center justify-center text-xl shadow-lg hover:scale-110 transition"
        title="Need Help?"
      >
        ?
      </button>

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal p-6 max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[var(--accent)]">💡 Help & Guide</h2>
              <button onClick={() => setOpen(false)} className="text-[var(--dim)] hover:text-white">✕</button>
            </div>
            
            <div className="space-y-4 text-sm text-[var(--text)]">
              <div className="card p-3">
                <strong className="text-[var(--accent)] block mb-1">🔐 How to Login?</strong>
                <p className="text-xs text-[var(--dim)]">Accounts ট্যাবে গিয়ে + Add চাপুন। আপনার Telegram নাম্বার দিন। OTP এবং 2FA (যদি থাকে) দিয়ে ভেরিফাই করুন।</p>
              </div>

              <div className="card p-3">
                <strong className="text-[var(--accent)] block mb-1">⚙️ How to Configure?</strong>
                <p className="text-xs text-[var(--dim)]">Configure এ গিয়ে Source দিন। আপনি চাইলে চ্যানেলের নাম, একটি নির্দিষ্ট পোস্টের লিংক, অথবা একাধিক লিংক দিতে পারেন। এরপর গ্রুপ সিলেক্ট করে Save করুন।</p>
              </div>

              <div className="card p-3">
                <strong className="text-[var(--accent)] block mb-1">🚀 How to Start?</strong>
                <p className="text-xs text-[var(--dim)]">Save করার পর Start বাটনে ক্লিক করুন। বট নির্দিষ্ট ইন্টারভাল পর পর আপনার সিলেক্ট করা গ্রুপগুলোতে পোস্ট পাঠাবে।</p>
              </div>

              <div className="card p-3 bg-[var(--accent)]/5 border-[var(--accent)]/30">
                <strong className="text-[var(--accent)] block mb-1">📞 Live Support</strong>
                <p className="text-xs text-[var(--dim)]">আরও সাহায্য লাগলে টেলিগ্রামে মেসেজ দিন: <a href="https://t.me/DEVELOPER_JAHID_BHAI" target="_blank" className="text-[var(--accent)] underline">@DEVELOPER_JAHID_BHAI</a></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
