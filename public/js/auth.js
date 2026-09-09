let currentRole = "applicant";

function switchAuthTab(tab) {
  const tabs = ["login", "register", "forgot"];
  tabs.forEach((t) => {
    const btn = document.getElementById(
      "tab" + t.charAt(0).toUpperCase() + t.slice(1),
    );
    const view = document.getElementById(
      "view" + t.charAt(0).toUpperCase() + t.slice(1),
    );
    if (btn) btn.classList.toggle("active", t === tab);
    if (view) view.style.display = t === tab ? "block" : "none";
  });
}

function setRole(role) {
  currentRole = role;
  const pillApp = document.getElementById("roleApplicant");
  const pillOff = document.getElementById("roleOfficial");
  if (pillApp) pillApp.classList.toggle("active", role === "applicant");
  if (pillOff) pillOff.classList.toggle("active", role === "official");
}

function fillDemo(type) {
  switchAuthTab("login");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (type === "applicant") {
    setRole("applicant");
    emailInput.value = "entrepreneur@mahindra-auto.in";
    passwordInput.value = "Applicant@123#";
  } else if (type === "official_msins" || type === "official_industries") {
    setRole("official");
    emailInput.value = "officer@udyog.gov.in";
    passwordInput.value = "Officer@123#";
  } else if (type === "official_midc") {
    setRole("official");
    emailInput.value = "midc.officer@udyog.gov.in";
    passwordInput.value = "Midc@123#";
  } else if (type === "official_mpcb") {
    setRole("official");
    emailInput.value = "mpcb.officer@udyog.gov.in";
    passwordInput.value = "Mpcb@123#";
  } else if (type === "official_fire") {
    setRole("official");
    emailInput.value = "fire.officer@udyog.gov.in";
    passwordInput.value = "Fire@123#";
  } else if (type === "official_dish") {
    setRole("official");
    emailInput.value = "dish.officer@udyog.gov.in";
    passwordInput.value = "Dish@123#";
  }
}

// Live Password Complexity Checker for Registration
function checkPasswordRules(pwd) {
  const minLen = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNum = /\d/.test(pwd);
  const hasSym = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  updateRuleUI("ruleMinLength", minLen, "At least 8 characters");
  updateRuleUI("ruleLetter", hasLetter, "Contains letters (a-z, A-Z)");
  updateRuleUI("ruleNumber", hasNum, "Contains numbers (0-9)");
  updateRuleUI("ruleSymbol", hasSym, "Contains symbol (@#$%)");

  return minLen && hasLetter && hasNum && hasSym;
}

function updateRuleUI(elemId, isValid, text) {
  const elem = document.getElementById(elemId);
  if (!elem) return;
  if (isValid) {
    elem.className = "pwd-rule-item valid";
    elem.textContent = `✓ ${text}`;
  } else {
    elem.className = "pwd-rule-item invalid";
    elem.textContent = `○ ${text}`;
  }
}

// Live Confirm Password Match Checker for Registration
function checkPasswordMatch() {
  const pwd = document.getElementById("regPassword")?.value || "";
  const cpwd = document.getElementById("regConfirmPassword")?.value || "";
  const msg = document.getElementById("pwdMatchMsg");
  if (!msg) return;

  if (!cpwd) {
    msg.textContent = "";
    return true;
  }

  if (pwd === cpwd) {
    msg.style.color = "var(--emerald)";
    msg.textContent = "✓ Passwords match";
    return true;
  } else {
    msg.style.color = "var(--ruby)";
    msg.textContent = "✕ Passwords do not match";
    return false;
  }
}

// Live GSTIN Formatter & Validator (15 to 16 characters, uppercase capital letters & numbers only, mix required)
function handleGstinInput(input) {
  const orig = input.value;
  const filtered = orig.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (orig !== filtered) {
    input.value = filtered;
  }
  validateGstinLive(filtered);
}

function validateGstinLive(val) {
  const msg = document.getElementById("gstinValidationMsg");
  if (!msg) return false;
  if (!val) {
    msg.textContent = "";
    return false;
  }
  const len = val.length;
  const hasLetters = /[A-Z]/.test(val);
  const hasDigits = /\d/.test(val);

  if (len < 15) {
    msg.style.color = "#d97706";
    msg.textContent = `⚠️ ${len}/15 characters (Requires 15-16 uppercase letters & numbers)`;
    return false;
  } else if (len === 15 || len === 16) {
    if (!hasLetters || !hasDigits) {
      msg.style.color = "var(--ruby)";
      msg.textContent =
        "✕ GSTIN must be a mix of both capital letters (A-Z) and numbers (0-9).";
      return false;
    } else {
      msg.style.color = "var(--emerald)";
      msg.textContent =
        `✓ Valid ${len}-character alphanumeric GSTIN (Capital Letters & Digits)`;
      return true;
    }
  } else if (len > 16) {
    msg.style.color = "var(--ruby)";
    msg.textContent = "✕ GSTIN cannot exceed 16 characters.";
    return false;
  }
  return false;
}

// Live Phone Validator (Mandatory 10 digits Indian mobile)
function checkPhoneLive(val) {
  const msg = document.getElementById("phoneValidationMsg");
  if (!msg) return false;
  if (!val) {
    msg.textContent = "";
    return false;
  }
  if (val.length < 10) {
    msg.style.color = "#d97706";
    msg.textContent = `⚠️ ${val.length}/10 digits entered`;
    return false;
  } else if (val.length === 10) {
    if (!/^[6-9]\d{9}$/.test(val)) {
      msg.style.color = "var(--ruby)";
      msg.textContent =
        "✕ Must be a valid mobile number starting with 6, 7, 8, or 9";
      return false;
    } else {
      msg.style.color = "var(--emerald)";
      msg.textContent = "✓ Valid 10-digit mobile number";
      return true;
    }
  }
  return false;
}

// Sample Enterprise Autofill Helper for Fast Testing
function fillSampleEnterprise() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  const comp = document.getElementById("regCompanyName");
  if (comp) comp.value = "Sahyadri Precision Components Pvt Ltd";

  const gstin = document.getElementById("regGstin");
  if (gstin) {
    gstin.value = "27AAACS9999M1Z90"; // Exactly 16 chars: letters & digits mix, capitals only
    handleGstinInput(gstin);
  }

  const contact = document.getElementById("regContactPerson");
  if (contact) contact.value = "Anand R. Kulkarni";

  const phone = document.getElementById("regPhone");
  if (phone) {
    phone.value = "9820011223";
    checkPhoneLive("9820011223");
  }

  const pwd = document.getElementById("regPassword");
  const cpwd = document.getElementById("regConfirmPassword");
  if (pwd) pwd.value = "Company@123#";
  if (cpwd) cpwd.value = "Company@123#";
  checkPasswordRules("Company@123#");
  checkPasswordMatch();

  const email = document.getElementById("regEmail");
  if (email) {
    email.value = "";
    email.focus();
    alert(
      "Sample company details populated!\n\nPlease enter your actual email address in the 'Official Email Address' field and click 'Send OTP' to receive the live Gmail verification code.",
    );
  }
}

// Registration OTP Dispatch with 90-Second Timer & Resend
// Registration OTP Dispatch with 90-Second Timer & Resend Cooldown
let isRegEmailVerified = false;
let regOtpTimerInterval = null;
let regOtpTimeRemaining = 90; // 1 minute 30 seconds
const OTP_RESEND_COOLDOWN_SECONDS = 15; // 15 seconds cooldown between send requests
let regOtpCooldownRemaining = 0;

function startRegOtpCountdown() {
  if (regOtpTimerInterval) clearInterval(regOtpTimerInterval);
  regOtpTimeRemaining = 90;
  regOtpCooldownRemaining = OTP_RESEND_COOLDOWN_SECONDS;
  updateRegOtpTimerDisplay(false);

  const resendBtn = document.getElementById("btnResendRegOtp");
  const sendBtn = document.getElementById("btnSendRegOtp");
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.style.opacity = "0.5";
    resendBtn.style.opacity = "0.6";
    resendBtn.style.cursor = "not-allowed";
    resendBtn.textContent = `⏳ Resend in ${regOtpCooldownRemaining}s`;
  }
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = `Resend in ${regOtpCooldownRemaining}s`;
  }

  regOtpTimerInterval = setInterval(() => {
    regOtpTimeRemaining--;
    if (regOtpCooldownRemaining > 0) {
      regOtpCooldownRemaining--;
    }
    updateRegOtpTimerDisplay(false);

    // Enable Resend button after 15 seconds cooldown
    if (regOtpTimeRemaining <= 75 && resendBtn && resendBtn.disabled) {
      resendBtn.disabled = false;
      resendBtn.style.opacity = "1";
      resendBtn.style.cursor = "pointer";
    // Active decreasing countdown on resend buttons
    if (regOtpCooldownRemaining > 0) {
      if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.style.opacity = "0.6";
        resendBtn.style.cursor = "not-allowed";
        resendBtn.textContent = `⏳ Resend in ${regOtpCooldownRemaining}s`;
      }
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = `Resend in ${regOtpCooldownRemaining}s`;
      }
    } else {
      if (resendBtn && resendBtn.disabled) {
        resendBtn.disabled = false;
        resendBtn.style.opacity = "1";
        resendBtn.style.cursor = "pointer";
        resendBtn.textContent = "🔄 Resend OTP";
      }
      if (sendBtn && sendBtn.disabled) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Resend OTP ✉";
      }
    }

    if (regOtpTimeRemaining <= 0) {
      clearInterval(regOtpTimerInterval);
      updateRegOtpTimerDisplay(true);
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.style.opacity = "1";
        resendBtn.style.cursor = "pointer";
        resendBtn.textContent = "🔄 Resend OTP";
      }
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Resend OTP ✉";
      }
      const otpStatus = document.getElementById("regOtpStatus");
      if (otpStatus && !isRegEmailVerified) {
        otpStatus.innerHTML = `<span style="color: var(--ruby); font-weight: 700;">⚠️ OTP expired (1 min 30 sec limit). Please click "🔄 Resend OTP" to request a fresh code.</span>`;
        otpStatus.innerHTML = `<span style="color: var(--ruby); font-weight: 700;">⚠️ One-Time Password expired (1 min 30 sec limit). Please click "🔄 Resend OTP" to request a fresh code.</span>`;
      }
    }
  }, 1000);
}

function updateRegOtpTimerDisplay(expired = false) {
  const pill = document.getElementById("otpTimerPill");
  if (!pill) return;

  if (expired || regOtpTimeRemaining <= 0) {
    pill.style.background = "#fee2e2";
    pill.style.color = "#dc2626";
    pill.innerHTML = "⚠️ OTP Expired";
  } else {
    const mins = Math.floor(regOtpTimeRemaining / 60);
    const secs = regOtpTimeRemaining % 60;
    pill.style.background = "#fef3c7";
    pill.style.color = "#b45309";
    pill.innerHTML = `⏱️ Valid for: <span id="otpCountdown">${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}</span>`;
  }
}

async function handleResendRegOtp() {
  const resendBtn = document.getElementById("btnResendRegOtp");
  if (resendBtn && regOtpCooldownRemaining > 0) {
    return; // Still in cooldown
  }
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.textContent = "Resending...";
  }
  await handleSendRegOtp(true);
  if (resendBtn) {
    resendBtn.textContent = "🔄 Resend OTP";
  }
}

async function handleSendRegOtp(isResend = false) {
  const emailInput = document.getElementById("regEmail");
  const email = emailInput?.value.trim();
  const btn = document.getElementById("btnSendRegOtp");
  const otpGroup = document.getElementById("regOtpGroup");
  const otpStatus = document.getElementById("regOtpStatus");

  if (!email || !email.includes("@") || !email.includes(".")) {
    alert(
      "Please enter a valid official email address first (e.g. yourcompany@gmail.com).",
    );
    emailInput?.focus();
    return;
  }

  // Open the OTP container immediately so the user sees real-time progress
  if (otpGroup) otpGroup.style.display = "block";

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = isResend ? "Resending..." : "Sending...";
    }
    if (otpStatus) {
      otpStatus.innerHTML = `<span style="color: var(--navy); font-weight: 600;">⏳ Connecting to Gmail SMTP & dispatching OTP to <b>${email}</b>...</span>`;
      const safeEmail = typeof escapeHtml === "function" ? escapeHtml(email) : email;
      otpStatus.innerHTML = `<span style="color: var(--navy); font-weight: 600;">⏳ Connecting to Gmail SMTP & dispatching OTP to <b>${safeEmail}</b>...</span>`;
    }

    const res = await api("/api/otp/send", {
      method: "POST",
      body: JSON.stringify({ email, purpose: "registration" }),
    });

    if (btn) {
      btn.textContent = "Resend OTP ✉";
      btn.disabled = false;
    }

    const inp = document.getElementById("regOtpInput");
    if (inp) {
      inp.disabled = false;
      if (isResend) inp.value = "";
      inp.focus();
    }

    startRegOtpCountdown();

    const safeRecipient = typeof escapeHtml === "function" ? escapeHtml(res.recipient || email) : (res.recipient || email);
    if (res.devOtp) {
      const safeDevOtp = typeof escapeHtml === "function" ? escapeHtml(res.devOtp) : res.devOtp;
      otpStatus.innerHTML = `
        <div class="dev-otp-pill">
          <span><b>OTP Sent!</b> (Dev Mode: <b>${res.devOtp}</b>)</span>
          <button type="button" class="btn outline sm" style="padding: 2px 8px; font-size: 0.72rem;" onclick="autofillRegOtp('${res.devOtp}')">Auto-fill</button>
          <span><b>OTP Sent!</b> (Dev Mode: <b>${safeDevOtp}</b>)</span>
          <button type="button" class="btn outline sm" style="padding: 2px 8px; font-size: 0.72rem;" onclick="autofillRegOtp('${safeDevOtp}')">Auto-fill</button>
        </div>
      `;
    } else {
      otpStatus.innerHTML = `
        <div style="color: var(--emerald); font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 12px;">
          ✓ OTP dispatched via Gmail to <b>${res.recipient || email}</b>!
          ✓ OTP dispatched via Gmail to <b>${safeRecipient}</b>!
          <div style="color: #065f46; font-size: 0.76rem; font-weight: normal; margin-top: 3px;">
            Please check your inbox & spam folder. Code is valid for <b>1 minute 30 seconds</b>.
          </div>
        </div>
      `;
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Send OTP ✉";
    }
    const errMsg =
      err.message &&
      (err.message.includes("fetch") || err.message.includes("NetworkError"))
        ? "Unable to reach Udyog Samyog server. Please ensure the backend server is running on port 3000."
        : err.message;

    const safeErrMsg = typeof escapeHtml === "function" ? escapeHtml(errMsg) : errMsg;
    if (otpStatus) {
      otpStatus.innerHTML = `
        <div style="color: var(--ruby); font-weight: 700; background: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 8px 12px; margin-top: 4px;">
          ✕ ${errMsg}
          ✕ ${safeErrMsg}
        </div>
      `;
    }
    show("regmsg", errMsg);
    alert("OTP Dispatch Error:\n\n" + errMsg);
  }
}

function autofillRegOtp(code) {
  const inp = document.getElementById("regOtpInput");
  if (inp) {
    inp.value = code;
    handleVerifyRegOtp();
  }
}

// Verify Registration OTP
async function handleVerifyRegOtp() {
  const email = document.getElementById("regEmail")?.value.trim();
  const otp = document.getElementById("regOtpInput")?.value.trim();
  const otpStatus = document.getElementById("regOtpStatus");
  const verifyBtn = document.getElementById("btnVerifyRegOtp");
  const timerPill = document.getElementById("otpTimerPill");

  if (!otp || otp.length < 6) {
    alert(
      "Please enter the full 6-digit verification OTP received on your email.",
    );
    document.getElementById("regOtpInput")?.focus();
    return;
  }

  try {
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";
    const res = await api("/api/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp, purpose: "registration" }),
    });

    isRegEmailVerified = true;
    if (regOtpTimerInterval) clearInterval(regOtpTimerInterval);

    verifyBtn.textContent = "Verified ✓";
    verifyBtn.className = "btn emerald sm";
    document.getElementById("regOtpInput").disabled = true;
    document.getElementById("regEmail").readOnly = true;
    const sendBtn = document.getElementById("btnSendRegOtp");
    if (sendBtn) sendBtn.style.display = "none";
    const resendBtn = document.getElementById("btnResendRegOtp");
    if (resendBtn) resendBtn.style.display = "none";

    if (timerPill) {
      timerPill.style.background = "#dcfce7";
      timerPill.style.color = "#15803d";
      timerPill.innerHTML = "✓ Verified";
    }

    otpStatus.innerHTML = `<span style="color: var(--emerald); font-weight: 700;">✓ Official Email Verified for Udyog Samyog Enterprise Account (${email})</span>`;
    const safeEmail = typeof escapeHtml === "function" ? escapeHtml(email) : email;
    otpStatus.innerHTML = `<span style="color: var(--emerald); font-weight: 700;">✓ Official Email Verified for Udyog Samyog Enterprise Account (${safeEmail})</span>`;
  } catch (err) {
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify OTP ✓";
    const errMsg = err.message || "OTP verification failed.";
    const safeErrMsg = typeof escapeHtml === "function" ? escapeHtml(errMsg) : errMsg;
    otpStatus.innerHTML = `
      <div style="color: var(--ruby); font-weight: 700; background: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 8px 12px; margin-top: 4px;">
        ✕ ${errMsg}
        ✕ ${safeErrMsg}
      </div>
    `;
    alert("OTP Verification Failed:\n\n" + errMsg);
  }
}

// Login form submission
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      show(
        "msg",
        "Verifying credentials with Maharashtra State Single Window (Udyog Samyog)...",
      );
      const d = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: currentRole }),
      });

      location =
        currentRole === "official"
          ? getOfficerDashboardUrl(d.user)
          : "/pages/applicant-dashboard.html";
    } catch (x) {
      show("msg", x.message);
    }
  };
}

// Register form submission
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.onsubmit = async (e) => {
    e.preventDefault();

    // 1. Mandatory GSTIN validation: 15 to 16 characters, capital letters and numbers only, mix required
    const gstin =
      document.getElementById("regGstin")?.value.trim().toUpperCase() || "";
    if (gstin.length < 15 || gstin.length > 16) {
      show(
        "regmsg",
        `GSTIN must be 15 to 16 characters in length (you entered ${gstin.length} characters). Standard Indian GSTIN is 15 characters.`,
      );
      document.getElementById("regGstin")?.focus();
      return;
    }
    if (!/^[A-Z0-9]{15,16}$/.test(gstin)) {
      show(
        "regmsg",
        "GSTIN must contain only capital letters (A-Z) and numbers (0-9).",
      );
      document.getElementById("regGstin")?.focus();
      return;
    }
    if (!/[A-Z]/.test(gstin) || !/\d/.test(gstin)) {
      show(
        "regmsg",
        "GSTIN must be a mix of letters and numbers (both capital letters and numbers are required).",
      );
      document.getElementById("regGstin")?.focus();
      return;
    }

    // 2. Mandatory Mobile Phone validation: exactly 10 digits
    const phone = document.getElementById("regPhone")?.value.trim() || "";
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (
      !cleanPhone ||
      cleanPhone.length !== 10 ||
      !/^[6-9]\d{9}$/.test(cleanPhone)
    ) {
      show(
        "regmsg",
        "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
      );
      document.getElementById("regPhone")?.focus();
      return;
    }

    // 3. Password validations
    const password = document.getElementById("regPassword")?.value || "";
    const confirmPassword =
      document.getElementById("regConfirmPassword")?.value || "";

    if (!checkPasswordRules(password)) {
      show(
        "regmsg",
        "Password does not meet complexity standards: min 8 characters, alphanumeric with at least one special symbol.",
      );
      return;
    }

    if (password !== confirmPassword) {
      show(
        "regmsg",
        "Password and Confirm Password do not match. Please verify.",
      );
      return;
    }

    // 4. Mandatory OTP validation
    const otp = document.getElementById("regOtpInput")?.value.trim() || "";
    if (!isRegEmailVerified && !otp) {
      show(
        "regmsg",
        "Official Email Verification Required: Please click 'Send OTP' and enter the 6-digit code sent to your email.",
      );
      const otpGroup = document.getElementById("regOtpGroup");
      if (otpGroup) otpGroup.style.display = "block";
      document.getElementById("regOtpInput")?.focus();
      return;
    }

    try {
      const payload = Object.fromEntries(new FormData(registerForm));
      payload.email = document
        .getElementById("regEmail")
        ?.value.trim()
        .toLowerCase();
      payload.registrationNo = gstin;
      payload.phone = cleanPhone;
      payload.password = password;
      payload.confirmPassword = confirmPassword;
      payload.otp = otp;

      show("regmsg", "Creating unified enterprise profile on Udyog Samyog...");
      const res = await api("/api/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      show(
        "regmsg",
        "Enterprise successfully registered on Udyog Samyog! Redirecting to login...",
        true,
      );
      alert(
        "Registration Successful!\n\nYour enterprise profile has been created on Udyog Samyog. You can now log in.",
      );
      registerForm.reset();
      setTimeout(() => {
        switchAuthTab("login");
        setRole("applicant");
        document.getElementById("email").value = payload.email;
      }, 1500);
    } catch (x) {
      show("regmsg", x.message);
      alert("Registration Failed:\n\n" + x.message);
    }
  };
}

// Forgot Password with OTP & Live Rules
function checkForgotRules(pwd) {
  const minLen = pwd.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNum = /\d/.test(pwd);
  const hasSym = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  updateRuleUI("fRuleMin", minLen, "8+ characters");
  updateRuleUI("fRuleLetter", hasLetter, "Letters");
  updateRuleUI("fRuleNum", hasNum, "Numbers");
  updateRuleUI("fRuleSym", hasSym, "Special Symbol (@#$%)");

  return minLen && hasLetter && hasNum && hasSym;
}

function checkForgotMatch() {
  const pwd = document.getElementById("forgotNewPassword")?.value || "";
  const cpwd = document.getElementById("forgotConfirmPassword")?.value || "";
  const msg = document.getElementById("forgotMatchMsg");
  if (!msg) return;

  if (!cpwd) {
    msg.textContent = "";
    return true;
  }
  if (pwd === cpwd) {
    msg.style.color = "var(--emerald)";
    msg.textContent = "✓ Passwords match";
    return true;
  } else {
    msg.style.color = "var(--ruby)";
    msg.textContent = "✕ Passwords do not match";
    return false;
  }
}

let forgotOtpTimerInterval = null;
let forgotOtpTimeRemaining = 90;
let forgotOtpCooldownRemaining = 0;

function startForgotOtpCountdown() {
  if (forgotOtpTimerInterval) clearInterval(forgotOtpTimerInterval);
  forgotOtpTimeRemaining = 90;
  forgotOtpCooldownRemaining = OTP_RESEND_COOLDOWN_SECONDS;
  updateForgotOtpTimerDisplay(false);

  const btn = document.getElementById("btnSendForgotOtp");
  if (btn) {
    btn.disabled = true;
    btn.textContent = `⏳ Resend in ${forgotOtpCooldownRemaining}s`;
  }

  forgotOtpTimerInterval = setInterval(() => {
    forgotOtpTimeRemaining--;
    if (forgotOtpCooldownRemaining > 0) {
      forgotOtpCooldownRemaining--;
    }
    updateForgotOtpTimerDisplay(false);

    const btn = document.getElementById("btnSendForgotOtp");
    if (forgotOtpCooldownRemaining > 0) {
      if (btn) {
        btn.disabled = true;
        btn.textContent = `⏳ Resend in ${forgotOtpCooldownRemaining}s`;
      }
    } else {
      if (btn && btn.disabled) {
        btn.disabled = false;
        btn.textContent = "Resend OTP ✉";
      }
    }

    if (forgotOtpTimeRemaining <= 0) {
      clearInterval(forgotOtpTimerInterval);
      updateForgotOtpTimerDisplay(true);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Resend OTP ✉";
      }
      show("forgotmsg", "⚠️ One-Time Password expired. Please click 'Resend OTP' to request a fresh code.");
    }
  }, 1000);
}

function updateForgotOtpTimerDisplay(expired = false) {
  const pill = document.getElementById("otpTimerPillForgot");
  if (!pill) return;
  if (expired || forgotOtpTimeRemaining <= 0) {
    pill.style.background = "#fee2e2";
    pill.style.color = "#dc2626";
    pill.innerHTML = "⚠️ OTP Expired";
  } else {
    const mins = Math.floor(forgotOtpTimeRemaining / 60);
    const secs = forgotOtpTimeRemaining % 60;
    pill.style.background = "#fef3c7";
    pill.style.color = "#b45309";
    pill.innerHTML = `⏱️ Valid for: <span id="forgotOtpCountdown">${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}</span>`;
  }
}

async function handleSendForgotOtp() {
  const email = document.getElementById("forgotEmail")?.value.trim();
  const btn = document.getElementById("btnSendForgotOtp");
  const otpGroup = document.getElementById("forgotOtpGroup");

  if (!email) {
    alert("Please enter your registered email address.");
    return;
  }

  if (forgotOtpCooldownRemaining > 0) {
    return; // Active cooldown
  }

  try {
    btn.disabled = true;
    btn.textContent = "Sending...";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending...";
    }
    const res = await api("/api/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    otpGroup.style.display = "block";
    btn.textContent = "Resend OTP";
    btn.disabled = false;
    if (otpGroup) otpGroup.style.display = "block";
    startForgotOtpCountdown();

    if (res.devOtp) {
      show(
        "forgotmsg",
        `OTP Dispatched! (Dev Mode: ${res.devOtp}) - Enter OTP below along with new password.`,
        `One-Time Password Dispatched! (Dev Mode: ${res.devOtp}) - Enter code below along with your new password.`,
        true,
      );
      document.getElementById("forgotOtp").value = res.devOtp;
      const forgotInp = document.getElementById("forgotOtp");
      if (forgotInp) forgotInp.value = res.devOtp;
    } else {
      show("forgotmsg", res.message, true);
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Send OTP ✉";
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Send OTP ✉";
    }
    show("forgotmsg", err.message);
  }
}

async function handleResetPasswordSubmit() {
  const email = document.getElementById("forgotEmail")?.value.trim();
  const otp = document.getElementById("forgotOtp")?.value.trim();
  const password = document.getElementById("forgotNewPassword")?.value;
  const confirmPassword = document.getElementById(
    "forgotConfirmPassword",
  )?.value;

  if (!otp) {
    show("forgotmsg", "Please enter the 6-digit verification OTP.");
    show("forgotmsg", "Please enter the 6-digit verification One-Time Password.");
    return;
  }

  if (!checkForgotRules(password)) {
    show(
      "forgotmsg",
      "Password must be at least 8 characters, alphanumeric, and contain at least one special symbol.",
    );
    return;
  }

  if (password !== confirmPassword) {
    show("forgotmsg", "Password and Confirm Password do not match.");
    return;
  }

  try {
    show("forgotmsg", "Updating password securely on Udyog Samyog...");
    const res = await api("/api/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, password, confirmPassword }),
    });

    if (forgotOtpTimerInterval) clearInterval(forgotOtpTimerInterval);

    show(
      "forgotmsg",
      "Password updated successfully! Redirecting to login...",
      true,
    );
    setTimeout(() => {
      switchAuthTab("login");
      document.getElementById("email").value = email;
      document.getElementById("password").value = password;
    }, 1500);
  } catch (err) {
    show("forgotmsg", err.message);
  }
}

// Gmail Configuration Modal Handlers
async function openGmailConfigModal() {
  const modal = document.getElementById("gmailModal");
  if (modal) modal.style.display = "grid";

  try {
    const status = await api("/api/config/gmail");
    if (status && status.isConfigured) {
      show(
        "gmailConfigMsg",
        `Active: Gmail SMTP is currently configured (${status.user}). You can update credentials or test connection below.`,
        true,
      );
    }
  } catch (_) {}
}

function closeGmailConfigModal() {
  const modal = document.getElementById("gmailModal");
  if (modal) modal.style.display = "none";
}

async function saveGmailConfig() {
  const user = document.getElementById("gmailUserConfig")?.value.trim();
  const appPassword = document.getElementById("gmailPassConfig")?.value.trim();

  if (!user || !appPassword) {
    show(
      "gmailConfigMsg",
      "Both Gmail address and 16-character App Password are required.",
    );
    return false;
  }

  try {
    show("gmailConfigMsg", "Saving configuration to system...");
    const res = await api("/api/config/gmail", {
      method: "POST",
      body: JSON.stringify({ user, appPassword }),
    });
    show(
      "gmailConfigMsg",
      "✓ Gmail SMTP activated! Credentials saved to .env file for persistence.",
      true,
    );
    return true;
  } catch (err) {
    show("gmailConfigMsg", err.message);
    return false;
  }
}

async function testGmailConfig() {
  const user = document.getElementById("gmailUserConfig")?.value.trim();
  const appPassword = document.getElementById("gmailPassConfig")?.value.trim();

  if (user && appPassword) {
    const saved = await saveGmailConfig();
    if (!saved) return;
  }

  try {
    show("gmailConfigMsg", "Testing live connection to Gmail SMTP servers...");
    const res = await api("/api/config/gmail/test", { method: "POST" });
    show(
      "gmailConfigMsg",
      res.message || "✓ Successfully connected to Gmail!",
      true,
    );
  } catch (err) {
    show("gmailConfigMsg", err.message);
  }
}
