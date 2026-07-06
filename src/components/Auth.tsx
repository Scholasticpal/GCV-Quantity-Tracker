import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Mail, Lock, KeyRound, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

type AuthTab = "login" | "signup" | "forgot";
type ForgotStep = "email" | "otp" | "reset";
type SignupStep = "details" | "otp";

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-shadow"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function EmailInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="email"
        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-shadow"
      />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 flex items-start gap-2">
      <span className="shrink-0 mt-0.5">⚠</span>
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="p-3 bg-white text-slate-800 text-sm rounded-r-md border-l-4 border-l-emerald-600 shadow-lg flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function Auth() {
  const [activeTab, setActiveTab] = useState<AuthTab>("login");

  // ---------- Shared ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  // ---------- Signup ----------
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ---------- Forgot ----------
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const resetState = () => {
    setError(null);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const switchTab = (tab: AuthTab) => {
    resetState();
    localStorage.removeItem("isResettingPassword");
    if (tab === "forgot") {
      setForgotStep("email");
      setForgotEmail(email);
    } else if (tab === "signup") {
      setSignupStep("details");
    }
    setActiveTab(tab);
  };

  // ======================== LOGIN ========================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      const { data } = await supabase
        .from("user_roles")
        .select("is_banned")
        .eq("email", email.trim())
        .single();

      if (data?.is_banned === true) {
        window.alert("Access Denied: This account has been banned by an administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      await supabase.rpc('log_activity', { p_category: 'AUTH', p_detail: 'User logged in', p_metadata: { action_type: 'Log In' } });
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ======================== SIGNUP ========================
  const handleSignupDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
          setError("Account already exists. Please log in.");
        } else {
          throw error;
        }
        return;
      }

      // Supabase may return a fake user with identities: [] when duplicates exist
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setError("Account already exists. Please log in.");
        return;
      }

      setSignupStep("otp");
      setMessage("An 8-digit OTP has been sent to your email.");
      await supabase.rpc('log_activity', { p_category: 'AUTH', p_detail: 'New account created', p_metadata: { action_type: 'Sign Up' } });
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanOtp = otp.replace(/\s/g, "");
    if (cleanOtp.length !== 8 || !/^\d{8}$/.test(cleanOtp)) {
      setError("Please enter a valid 8-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: "signup",
      });
      if (error) throw error;
      setMessage("Account verified successfully! Logging you in...");
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ======================== FORGOT — STEP 1 ========================
  const handleForgotSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      if (error) throw error;
      setForgotStep("otp");
      setMessage("An 8-digit OTP has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // ======================== FORGOT — STEP 2 ========================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanOtp = otp.replace(/\s/g, "");
    if (cleanOtp.length !== 8 || !/^\d{8}$/.test(cleanOtp)) {
      setError("Please enter a valid 8-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: cleanOtp,
        type: "recovery",
      });
      if (error) throw error;

      localStorage.setItem("isResettingPassword", "true");
      setForgotStep("reset");
      setMessage("OTP verified. Set your new password below.");
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // ======================== FORGOT — STEP 3 ========================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!newPassword || !confirmNewPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await supabase.auth.signOut();
      localStorage.removeItem("isResettingPassword");

      resetState();
      setActiveTab("login");
      setMessage("Password updated successfully. Please log in with your new password.");
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  // ======================== RENDER ========================
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-md shadow-lg border border-slate-200 max-w-md w-full overflow-hidden">
          {/* ---- Header ---- */}
          <div className="p-6 text-center border-b border-slate-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShieldCheck className="w-7 h-7 text-slate-800" />
              <h1 className="text-base font-bold text-slate-900">GCV & Quantity Manager</h1>
            </div>
            <p className="text-slate-500 text-sm">Authenticate to access the dashboard</p>
          </div>

          {/* ---- Tab Bar ---- */}
          {activeTab !== "forgot" && (
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => switchTab("login")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "login"
                  ? "bg-blue-50 border-b-2 border-[#003B70] text-[#003B70] font-medium"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
              >
                Login
              </button>
              <button
                onClick={() => switchTab("signup")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "signup"
                  ? "bg-blue-50 border-b-2 border-[#003B70] text-[#003B70] font-medium"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* ---- Forgot Password Header ---- */}
          {activeTab === "forgot" && (
            <div className="flex items-center gap-2 px-6 pt-5 pb-2">
              <button
                onClick={() => switchTab("login")}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Back to login"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold text-slate-800">Reset Password</h2>
              <div className="ml-auto flex items-center gap-1.5">
                {(["email", "otp", "reset"] as ForgotStep[]).map((step, i) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-sm transition-colors ${(forgotStep === "email" && i === 0) ||
                      (forgotStep === "otp" && i <= 1) ||
                      (forgotStep === "reset" && i <= 2)
                      ? "bg-[#003B70]"
                      : "bg-slate-300"
                      }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ---- Signup Header (OTP Step) ---- */}
          {activeTab === "signup" && signupStep === "otp" && (
            <div className="flex items-center gap-2 px-6 pt-5 pb-2">
              <button
                onClick={() => {
                  setSignupStep("details");
                  setError(null);
                  setMessage(null);
                  setOtp("");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Back to details"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold text-slate-800">Verify Email</h2>
              <div className="ml-auto flex items-center gap-1.5">
                {(["details", "otp"] as SignupStep[]).map((step) => (
                  <div
                    key={step}
                    className="w-2 h-2 rounded-sm transition-colors bg-[#003B70]"
                  />
                ))}
              </div>
            </div>
          )}

          {/* ---- Form Body ---- */}
          <div className="p-6">
            {error && <ErrorBanner message={error} />}
            {message && <SuccessBanner message={message} />}

            <div className={error || message ? "mt-4" : ""}>
              {/* ======== LOGIN FORM ======== */}
              {activeTab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="loginEmail" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <EmailInput
                      id="loginEmail"
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="loginPassword" className="block text-sm font-medium text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => switchTab("forgot")}
                        className="text-xs text-[#003B70] hover:text-[#002A50] font-semibold transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <PasswordInput
                      id="loginPassword"
                      value={password}
                      onChange={setPassword}
                      placeholder="Enter your password"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003B70] hover:bg-[#002A50] text-white font-semibold py-2.5 px-4 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-sm"
                  >
                    {loading ? "Signing in…" : "Sign In"}
                  </button>
                </form>
              )}

              {/* ======== SIGNUP — STEP 1: DETAILS ======== */}
              {activeTab === "signup" && signupStep === "details" && (
                <form onSubmit={handleSignupDetails} className="space-y-4">
                  <div>
                    <label htmlFor="signupEmail" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <EmailInput
                      id="signupEmail"
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="signupPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <PasswordInput
                      id="signupPassword"
                      value={password}
                      onChange={setPassword}
                      placeholder="Minimum 8 characters"
                      disabled={loading}
                    />
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-xs text-amber-600 mt-1.5">Password must be at least 8 characters.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signupConfirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <PasswordInput
                      id="signupConfirm"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Re-enter your password"
                      disabled={loading}
                    />
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <p className="text-xs text-red-600 mt-1.5">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003B70] hover:bg-[#002A50] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-sm"
                  >
                    {loading ? "Sending OTP…" : "Create Account"}
                  </button>
                </form>
              )}

              {/* ======== SIGNUP — STEP 2: OTP ======== */}
              {activeTab === "signup" && signupStep === "otp" && (
                <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Enter the 8-digit code sent to <span className="font-semibold text-slate-700">{email}</span>.
                  </p>
                  <div>
                    <label htmlFor="signupOtpInput" className="block text-sm font-medium text-slate-700 mb-1.5">
                      OTP Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="signupOtpInput"
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        placeholder="00000000"
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-shadow"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 8}
                    className="w-full bg-[#003B70] hover:bg-[#002A50] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-sm"
                  >
                    {loading ? "Verifying…" : "Verify Email & Login"}
                  </button>
                </form>
              )}

              {/* ======== FORGOT — STEP 1: EMAIL ======== */}
              {activeTab === "forgot" && forgotStep === "email" && (
                <form onSubmit={handleForgotSendEmail} className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Enter the email address associated with your account and we'll send you an 8-digit OTP code.
                  </p>
                  <div>
                    <label htmlFor="forgotEmail" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <EmailInput
                      id="forgotEmail"
                      value={forgotEmail}
                      onChange={setForgotEmail}
                      placeholder="you@example.com"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003B70] hover:bg-[#002A50] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-sm"
                  >
                    {loading ? "Sending…" : "Send OTP Code"}
                  </button>
                </form>
              )}

              {/* ======== FORGOT — STEP 2: OTP ======== */}
              {activeTab === "forgot" && forgotStep === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Enter the 8-digit code sent to <span className="font-semibold text-slate-700">{forgotEmail}</span>.
                  </p>
                  <div>
                    <label htmlFor="otpInput" className="block text-sm font-medium text-slate-700 mb-1.5">
                      OTP Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="otpInput"
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        placeholder="00000000"
                        disabled={loading}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#003B70] focus:border-[#003B70] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-shadow"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 8}
                    className="w-full bg-[#003B70] hover:bg-[#002A50] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-sm"
                  >
                    {loading ? "Verifying…" : "Verify OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("email");
                      setError(null);
                      setMessage(null);
                      setOtp("");
                    }}
                    className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Didn't receive it? Go back
                  </button>
                </form>
              )}

              {/* ======== FORGOT — STEP 3: RESET ======== */}
              {activeTab === "forgot" && forgotStep === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Choose a new password for your account.
                  </p>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <PasswordInput
                      id="newPassword"
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder="Minimum 8 characters"
                      disabled={loading}
                    />
                    {newPassword.length > 0 && newPassword.length < 8 && (
                      <p className="text-xs text-amber-600 mt-1.5">Password must be at least 8 characters.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <PasswordInput
                      id="confirmNewPassword"
                      value={confirmNewPassword}
                      onChange={setConfirmNewPassword}
                      placeholder="Re-enter your new password"
                      disabled={loading}
                    />
                    {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
                      <p className="text-xs text-red-600 mt-1.5">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003B70] hover:bg-[#002A50] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-sm"
                  >
                    {loading ? "Updating…" : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="w-full bg-white border-t border-slate-200 py-3.5 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left shrink-0">
        <div className="text-xs text-slate-500 font-medium font-['Inter'] flex-1">
          &copy; {new Date().getFullYear()} GCV & Quantity Manager. All rights reserved.
        </div>
        <div className="text-xs text-slate-600 font-medium font-['Inter'] flex-1 text-center">
          Conceptualized & Developed by <span className="font-bold text-[#003B70]">Dr. Vijay Kumar Garg</span>
        </div>
        <div className="text-xs text-slate-500 font-medium font-['Inter'] flex-1 flex items-center justify-center md:justify-end gap-3">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            System Operational
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-slate-400">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
