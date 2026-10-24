
let currentEcoTrackUser = null;
let pendingSignupEmail = "";
let pendingPasswordResetEmail = "";

function escapeHTML(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function formatNumber(value){
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "0";
}

function formatDateTime(dateValue){
    if(!dateValue) return "—";

    const date = new Date(dateValue);

    if(Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN",{
        day:"numeric",
        month:"long",
        year:"numeric",
        hour:"numeric",
        minute:"2-digit"
    });
}

function formatDateOnly(dateValue){
    if(!dateValue) return "—";

    const date = new Date(dateValue);

    if(Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN",{
        day:"numeric",
        month:"long",
        year:"numeric"
    });
}

function setProfileMessage(message,isError=false){
    const el = document.getElementById("profileMessage");
    if(!el) return;

    el.textContent = message;
    el.style.display = message ? "block" : "none";
    el.classList.toggle("error",isError);
}

function updateLoggedInUI(user){
    const previousUserId = currentEcoTrackUser?.id || null;
    const nextUserId = user?.id || null;

    if(previousUserId && previousUserId !== nextUserId){
        resetCalculatorForAccountChange();
    }

    currentEcoTrackUser = user || null;

    const loginButton = document.getElementById("loginNavBtn");
    const profileButton = document.getElementById("profileNavBtn");
    const historySection = document.getElementById("historySection");

    if(user){
        if(loginButton) loginButton.style.display = "none";

        if(profileButton){
            profileButton.classList.add("show");
            profileButton.title =
                user.user_metadata?.full_name
                ? user.user_metadata.full_name
                : "Profile";
        }

        if(historySection){
            historySection.style.display = "block";
        }

        updateProfileFields(user);

    }else{
        if(loginButton) loginButton.style.display = "";

        if(profileButton){
            profileButton.classList.remove("show");
        }

        if(historySection){
            historySection.style.display = "none";
        }

        closeProfile();

        const panel = document.getElementById("historyPanel");
        const toggle = document.getElementById("historyToggle");

        if(panel) panel.classList.remove("open");
        if(toggle){
            toggle.classList.remove("open");
            toggle.setAttribute("aria-expanded","false");
        }
    }
}

function resetCalculatorForAccountChange(){
    const calculatorContainer = document.getElementById("calculatorForm");
    if(calculatorContainer){
        calculatorContainer.querySelectorAll("input").forEach(input => {
            if(input.type === "checkbox" || input.type === "radio"){
                input.checked = input.defaultChecked;
            }else{
                input.value = input.defaultValue;
            }
        });
        calculatorContainer.querySelectorAll("select").forEach(select => {
            select.selectedIndex = 0;
        });
        calculatorContainer.querySelectorAll("textarea").forEach(textarea => {
            textarea.value = textarea.defaultValue;
        });
    }

    const results = document.getElementById("results");
    if(results) results.style.display = "none";

    const defaults = {
        calculationDate: "—",
        monthlyResult: "—",
        co2Result: "—",
        scoreResult: "0",
        levelResult: "—",
        levelText: "Complete your calculation",
        levelProgressText: "Complete a calculation to see your progress",
        levelNext: "",
        scoreMessage: "",
        dashboardDate: "No calculation yet",
        dashboardScore: "—",
        dashboardLevel: "Calculate your footprint 🌱",
        dashboardMessage: "Your calculation insights will appear here after you calculate your footprint.",
        dashboardTotal: "—",
        heroFootprint: "28%"
    };

    Object.entries(defaults).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if(element) element.textContent = value;
    });

    ["transportPercent", "energyPercent", "foodPercent", "travelPercent", "wastePercent"].forEach(id => {
        const element = document.getElementById(id);
        if(element) element.textContent = "0%";
    });

    ["transportBar", "energyBar", "foodBar", "travelBar", "wasteBar", "levelProgressFill"].forEach(id => {
        const element = document.getElementById(id);
        if(element) element.style.width = "0%";
    });

    const scoreCircle = document.getElementById("scoreCircle");
    if(scoreCircle) scoreCircle.style.background = "conic-gradient(var(--green) 0deg, #dcebe2 0deg)";

    const levelIcon = document.getElementById("levelIcon");
    if(levelIcon) levelIcon.textContent = "🌱";

    const actionCards = document.getElementById("actionCards");
    if(actionCards){
        actionCards.innerHTML = '<div class="action-empty">Complete the calculator to receive personalized immediate action steps.</div>';
    }
}

function updateProfileFields(user){
    if(!user) return;

    const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "EcoTrack User";

    const email = user.email || "—";

    const displayName = document.getElementById("profileDisplayName");
    const displayEmail = document.getElementById("profileDisplayEmail");
    const displayJoined = document.getElementById("profileDisplayJoined");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");

    if(displayName) displayName.textContent = name;
    if(displayEmail) displayEmail.textContent = email;
    if(displayJoined) displayJoined.textContent = formatDateOnly(user.created_at);

    if(profileName) profileName.value = name;
    if(profileEmail) profileEmail.value = email;
}

function openProfile(){
    if(!currentEcoTrackUser){
        openLogin();
        return;
    }

    updateProfileFields(currentEcoTrackUser);

    const overlay = document.getElementById("profileOverlay");

    if(overlay){
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden","false");
    }

    setProfileMessage("");
}

function closeProfile(event){
    if(event && event.target && event.target.id !== "profileOverlay"){
        return;
    }

    const overlay = document.getElementById("profileOverlay");

    if(overlay){
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden","true");
    }
}

async function saveProfile(event){
    event.preventDefault();

    if(!currentEcoTrackUser){
        setProfileMessage("Please login first.",true);
        return;
    }

    const name = document.getElementById("profileName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();

    if(!name || !email){
        setProfileMessage("Please fill in both fields.",true);
        return;
    }

    setProfileMessage("Saving changes...");

    try{
        const originalEmail = currentEcoTrackUser.email || "";

        const updatePayload = {
            data:{
                ...currentEcoTrackUser.user_metadata,
                full_name:name
            }
        };

        if(email !== originalEmail){
            updatePayload.email = email;
        }

        const { data, error } =
            await supabaseClient.auth.updateUser(updatePayload);

        if(error){
            setProfileMessage(error.message,true);
            return;
        }

        currentEcoTrackUser =
            data.user || currentEcoTrackUser;

        updateLoggedInUI(currentEcoTrackUser);

        if(email !== originalEmail){
            setProfileMessage(
                "Name updated. Please check your email to confirm the new email address."
            );
        }else{
            setProfileMessage("Profile updated successfully.");
        }

    }catch(error){
        console.error(error);
        setProfileMessage(
            "Unable to update your profile. Please try again.",
            true
        );
    }
}

async function logoutUser(){
    const logoutButton = document.querySelector(".profile-logout-btn");

    if(logoutButton){
        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";
    }

    try{
        const { error } = await supabaseClient.auth.signOut({ scope: "local" });

        if(error){
            console.error("EcoTrackX logout error:", error);
            setProfileMessage("Logout failed: " + (error.message || "Please try again."), true);
            return;
        }

        updateLoggedInUI(null);
        closeProfile();

        const historyContent = document.getElementById("historyContent");
        if(historyContent){
            historyContent.innerHTML = '<div class="history-empty">Login to see your saved calculations.</div>';
        }

        const historyPanel = document.getElementById("historyPanel");
        if(historyPanel) historyPanel.classList.remove("open");

        const historyToggle = document.getElementById("historyToggle");
        if(historyToggle){
            historyToggle.classList.remove("open");
            historyToggle.setAttribute("aria-expanded", "false");
        }

    }catch(error){
        console.error("EcoTrackX logout exception:", error);
        setProfileMessage("Logout failed: " + (error?.message || "Check the browser console and try again."), true);
    }finally{
        if(logoutButton){
            logoutButton.disabled = false;
            logoutButton.textContent = "Logout";
        }
    }
}

function toggleHistory(){
    if(!currentEcoTrackUser){
        return;
    }

    const panel = document.getElementById("historyPanel");
    const button = document.getElementById("historyToggle");

    if(!panel || !button) return;

    const open = panel.classList.toggle("open");

    button.classList.toggle("open",open);
    button.setAttribute("aria-expanded",open ? "true" : "false");

    if(open){
        loadCalculationHistory();
    }
}

function historyRecordHTML(record){
    const diet = record.diet || "—";
    const waste = record.waste_management || "—";

    return `
        <div class="history-record">

            <div class="history-record-head">
                <span class="history-record-time">
                    Calculated ${escapeHTML(formatDateTime(record.calculated_at))}
                </span>

                <div class="history-record-actions">

                    <span class="history-score-pill">
                        Eco Score: ${escapeHTML(record.eco_score ?? "—")}
                    </span>

                    <button
                        type="button"
                        class="history-delete-btn"
                        onclick="deleteCalculation('${escapeHTML(record.id)}', event)"
                        title="Delete this calculation"
                        aria-label="Delete this calculation"
                    >
                        🗑️
                    </button>

                </div>
            </div>

            <div class="history-detail-grid">

                <div class="history-detail">
                    <span>Monthly Footprint</span>
                    <strong>${escapeHTML(formatNumber(record.monthly_footprint))} kg CO₂e</strong>
                </div>

                <div class="history-detail">
                    <span>Annual Footprint</span>
                    <strong>${escapeHTML(formatNumber(record.annual_footprint))} kg CO₂e</strong>
                </div>

                <div class="history-detail">
                    <span>Eco Level</span>
                    <strong>${escapeHTML(record.eco_level || "—")}</strong>
                </div>

                <div class="history-detail">
                    <span>Diet</span>
                    <strong>${escapeHTML(diet)}</strong>
                </div>

                <div class="history-detail">
                    <span>Car / Day</span>
                    <strong>${escapeHTML(record.car_km ?? 0)} km</strong>
                </div>

                <div class="history-detail">
                    <span>Bike / Day</span>
                    <strong>${escapeHTML(record.bike_km ?? 0)} km</strong>
                </div>

                <div class="history-detail">
                    <span>Public Transport / Day</span>
                    <strong>${escapeHTML(record.public_transport_km ?? 0)} km</strong>
                </div>

                <div class="history-detail">
                    <span>Electricity / Month</span>
                    <strong>${escapeHTML(record.electricity_kwh ?? 0)} kWh</strong>
                </div>

                <div class="history-detail">
                    <span>Flights / Month</span>
                    <strong>${escapeHTML(record.flights ?? 0)}</strong>
                </div>

                <div class="history-detail">
                    <span>Waste Management</span>
                    <strong>${escapeHTML(waste)}</strong>
                </div>

            </div>

            <div class="history-emission-title">
                Emission Breakdown
            </div>

            <div class="history-detail-grid">

                <div class="history-detail">
                    <span>Transportation</span>
                    <strong>${escapeHTML(formatNumber(record.transport_emission))} kg/year</strong>
                </div>

                <div class="history-detail">
                    <span>Energy</span>
                    <strong>${escapeHTML(formatNumber(record.energy_emission))} kg/year</strong>
                </div>

                <div class="history-detail">
                    <span>Flights</span>
                    <strong>${escapeHTML(formatNumber(record.flight_emission))} kg/year</strong>
                </div>

                <div class="history-detail">
                    <span>Food</span>
                    <strong>${escapeHTML(formatNumber(record.food_emission))} kg/year</strong>
                </div>

                <div class="history-detail">
                    <span>Waste</span>
                    <strong>${escapeHTML(formatNumber(record.waste_emission))} kg/year</strong>
                </div>

            </div>

            <div class="history-footer-note">
                This record contains the calculator inputs and calculated results saved on this date.
            </div>

        </div>
    `;
}

function groupHistoryByDate(records){
    const groups = {};

    records.forEach(record=>{
        const date = new Date(record.calculated_at);

        if(Number.isNaN(date.getTime())) return;

        const key = date.toLocaleDateString("en-CA");

        if(!groups[key]){
            groups[key] = {
                dateValue:record.calculated_at,
                records:[]
            };
        }

        groups[key].records.push(record);
    });

    return Object.values(groups);
}

function renderCalculationHistory(records){
    const container =
        document.getElementById("historyContent");

    if(!container) return;

    if(!records || records.length === 0){
        container.innerHTML = `
            <div class="history-empty">
                No calculations saved yet.<br>
                Complete the calculator while logged in and your result will appear here.
            </div>
        `;
        return;
    }

    const groups = groupHistoryByDate(records);

    container.innerHTML = groups.map((group,index)=>{

        const dateLabel = formatDateOnly(group.dateValue);

        const summary =
            group.records.length === 1
            ? "1 calculation"
            : `${group.records.length} calculations`;

        return `
            <div class="history-date-item">

                <button
                    type="button"
                    class="history-date-button"
                    onclick="toggleHistoryDate(this)"
                    aria-expanded="false"
                >
                    <span class="history-date-main">

                        <span class="history-calendar-icon">
                            📅
                        </span>

                        <span class="history-date-text">
                            <strong>${escapeHTML(dateLabel)}</strong>
                            <small>${escapeHTML(summary)}</small>
                        </span>

                    </span>

                    <span class="history-date-arrow">⌄</span>
                </button>

                <div class="history-date-details">
                    ${group.records.map(historyRecordHTML).join("")}
                </div>

            </div>
        `;
    }).join("");
}

async function deleteCalculation(calculationId,event){

    if(event){
        event.stopPropagation();
    }

    if(!currentEcoTrackUser){
        alert("Please login first.");
        return;
    }

    if(!calculationId){
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this calculation?\n\nThis action cannot be undone."
    );

    if(!confirmed){
        return;
    }

    try{

        const { error } =
            await supabaseClient
                .from("carbon_calculations")
                .delete()
                .eq("id",calculationId)
                .eq("user_id",currentEcoTrackUser.id);

        if(error){
            console.error("Delete calculation error:",error);
            alert("Unable to delete this calculation. Please try again.");
            return;
        }

        await loadCalculationHistory();

    }catch(error){
        console.error(error);
        alert("Something went wrong while deleting the calculation.");
    }
}

function toggleHistoryDate(button){
    const details =
        button.nextElementSibling;

    if(!details) return;

    const open =
        details.classList.toggle("open");

    button.classList.toggle("open",open);
    button.setAttribute(
        "aria-expanded",
        open ? "true" : "false"
    );
}

async function loadCalculationHistory(){
    const container =
        document.getElementById("historyContent");

    if(!container || !currentEcoTrackUser) return;

    container.innerHTML =
        '<div class="history-loading">Loading your calculation history...</div>';

    try{
        const { data, error } =
            await supabaseClient
                .from("carbon_calculations")
                .select("*")
                .eq("user_id",currentEcoTrackUser.id)
                .order("calculated_at",{ascending:false});

        if(error){
            console.error("History load error:",error);

            container.innerHTML = `
                <div class="history-empty">
                    Unable to load your calculation history.<br>
                    Make sure the Supabase <strong>carbon_calculations</strong> table and its policies are configured.
                </div>
            `;
            return;
        }

        renderCalculationHistory(data || []);

    }catch(error){
        console.error(error);

        container.innerHTML = `
            <div class="history-empty">
                Something went wrong while loading your history.
            </div>
        `;
    }
}

async function saveCalculation(data){
    try{
        const {
            data:{user},
            error:userError
        } = await supabaseClient.auth.getUser();

        if(userError || !user){
            console.log(
                "Guest calculation: not saved because the user is not logged in."
            );
            return;
        }

        const { error } =
            await supabaseClient
                .from("carbon_calculations")
                .insert({
                    user_id:user.id,

                    car_km:data.car,
                    bike_km:data.bike,
                    public_transport_km:data.publicTransport,

                    electricity_kwh:data.electricity,
                    flights:data.flights,

                    diet:data.dietName,
                    waste_management:data.wasteName,

                    monthly_footprint:Math.round(data.monthlyTotal),
                    annual_footprint:Math.round(data.yearlyTotal),

                    eco_score:data.score,
                    eco_level:data.level,

                    transport_emission:data.transportEmission,
                    energy_emission:data.energyEmission,
                    flight_emission:data.flightEmission,
                    food_emission:data.foodEmission,
                    waste_emission:data.wasteEmission
                });

        if(error){
            console.error(
                "Could not save calculation:",
                error
            );
            return;
        }

        console.log("EcoTrack calculation saved successfully.");

        const historyPanel =
            document.getElementById("historyPanel");

        if(historyPanel &&
           historyPanel.classList.contains("open")){
            loadCalculationHistory();
        }

    }catch(error){
        console.error(
            "Save calculation error:",
            error
        );
    }
}

async function initializeEcoTrackAuth(){
    supabaseClient.auth.onAuthStateChange((event, session) => {
        updateLoggedInUI(session?.user || null);

        if(event === "PASSWORD_RECOVERY"){
            openResetPasswordPage();
        }
    });

    try{
        const { data:{session}, error } = await supabaseClient.auth.getSession();
        if(error) throw error;
        updateLoggedInUI(session?.user || null);

        if(new URLSearchParams(window.location.search).get("reset-password") === "1" && session){
            openResetPasswordPage();
        }
    }catch(error){
        console.error("Auth initialization error:", error);
        updateLoggedInUI(null);
    }
}



function openLogin(push=true){
    document.getElementById("siteShell").style.display = "none";
    document.getElementById("explorePage").classList.remove("show");

    const authPage = document.getElementById("authPage");
    authPage.classList.add("show");
    authPage.setAttribute("aria-hidden","false");

    showLogin();
    window.scrollTo({top:0, behavior:"instant"});

    if(push && location.hash !== "#login"){
        history.pushState({login:true},"","#login");
    }
}

function closeAuth(){
    document.getElementById("authPage").classList.remove("show");
    document.getElementById("authPage").setAttribute("aria-hidden","true");
    document.getElementById("siteShell").style.display = "block";

    if(["#login","#signup","#forgot","#verify-email"].includes(location.hash)){
        history.back();
    }

    window.scrollTo({top:0, behavior:"smooth"});
}

function hideAuthCards(){
    document.getElementById("loginCard").style.display = "none";
    document.getElementById("signupCard").style.display = "none";
    document.getElementById("forgotCard").style.display = "none";
    document.getElementById("resetOtpCard").style.display = "none";
    document.getElementById("verifyOtpCard").style.display = "none";
    document.getElementById("resetPasswordCard").style.display = "none";
}

function showLogin(){
    hideAuthCards();
    document.getElementById("loginCard").style.display = "block";
    clearAuthMessages();
}

function showSignup(){
    hideAuthCards();
    document.getElementById("signupCard").style.display = "block";
    clearAuthMessages();

    if(location.hash !== "#signup"){
        history.pushState({signup:true},"","#signup");
    }
}

function showVerifyOtp(){
    hideAuthCards();
    document.getElementById("verifyOtpCard").style.display = "block";
    clearAuthMessages();
    if(location.hash !== "#verify-email"){
        history.pushState({verifyEmail:true},"","#verify-email");
    }
    window.scrollTo({top:0,behavior:"smooth"});
}

function showForgotPassword(){
    hideAuthCards();
    document.getElementById("forgotCard").style.display = "block";
    clearAuthMessages();

    const loginEmail = document.getElementById("loginEmail").value.trim();
    if(loginEmail){
        document.getElementById("forgotEmail").value = loginEmail;
    }

    if(location.hash !== "#forgot"){
        history.pushState({forgot:true},"","#forgot");
    }
}

function openResetPasswordPage(){
    const authPage = document.getElementById("authPage");
    const explorePage = document.getElementById("explorePage");
    if(explorePage) explorePage.classList.remove("show");
    document.getElementById("siteShell").style.display = "none";
    authPage.classList.add("show");
    authPage.setAttribute("aria-hidden", "false");
    hideAuthCards();
    document.getElementById("resetPasswordCard").style.display = "block";
    clearAuthMessages();
    window.scrollTo({top:0, behavior:"instant"});
}

function clearAuthMessages(){
    ["loginMessage","signupMessage","forgotMessage","verifyOtpMessage","resetOtpMessage","resetPasswordMessage"].forEach(id=>{
        const el = document.getElementById(id);
        if(el){
            el.textContent = "";
            el.style.display = "none";
            el.classList.remove("error");
        }
    });
}

function showAuthMessage(id, message, isError=false){
    const el = document.getElementById(id);
    el.textContent = message;
    el.style.display = "block";
    el.classList.toggle("error", isError);
}

function togglePassword(inputId, button){
    const input = document.getElementById(inputId);

    if(input.type === "password"){
        input.type = "text";
        button.textContent = "Hide";
    }else{
        input.type = "password";
        button.textContent = "Show";
    }
}

async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const remember = document.getElementById("rememberMe").checked;

    const loginButton = document.querySelector(
        "#loginCard button[type='submit']"
    );

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";
    }

    showAuthMessage("loginMessage", "Logging in...");

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            showAuthMessage("loginMessage", error.message, true);
            return;
        }

        currentEcoTrackUser = data.user || null;

        localStorage.setItem(
            "ecotrackRememberMe",
            remember ? "true" : "false"
        );

        updateLoggedInUI(currentEcoTrackUser);

        showAuthMessage(
            "loginMessage",
            "Login successful! Welcome back to EcoTrack."
        );

        setTimeout(async () => {
            const authPage = document.getElementById("authPage");
            const explorePage = document.getElementById("explorePage");
            const siteShell = document.getElementById("siteShell");

            if (authPage) {
                authPage.classList.remove("show");
                authPage.setAttribute("aria-hidden", "true");
            }

            if (explorePage) {
                explorePage.classList.remove("show");
                explorePage.setAttribute("aria-hidden", "true");
            }

            if (siteShell) {
                siteShell.style.display = "block";
            }

            history.replaceState(
                { home: true },
                "",
                window.location.pathname + window.location.search + "#home"
            );

            window.scrollTo({
                top: 0,
                behavior: "instant"
            });

            if (currentEcoTrackUser) {
                await loadCalculationHistory();
            }

        }, 900);

    } catch (error) {
        console.error("EcoTrackX login error:", error);

        showAuthMessage(
            "loginMessage",
            "Something went wrong. Please try again.",
            true
        );

    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    }
}

async function signupUser(event){
    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if(password !== confirmPassword){
        showAuthMessage("signupMessage","Passwords do not match.",true);
        return;
    }

    showAuthMessage("signupMessage","Creating your account and sending a verification code...");

    try{
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options:{
                data:{ full_name:name }
            }
        });

        if(error){
            showAuthMessage("signupMessage",error.message,true);
            return;
        }

        if(data.session && data.user){
            currentEcoTrackUser = data.user;
            updateLoggedInUI(currentEcoTrackUser);
            showAuthMessage("signupMessage","Your account is ready.");
            setTimeout(()=>{
                closeAuth();
                loadCalculationHistory();
            },700);
            return;
        }

        pendingSignupEmail = email;
        document.getElementById("signupOtp").value = "";
        document.getElementById("signupPassword").value = "";
        document.getElementById("signupConfirmPassword").value = "";
        showVerifyOtp();
        showAuthMessage(
            "verifyOtpMessage",
            "A verification code has been sent to " + email + ". Check your inbox and spam folder."
        );

    }catch(error){
        console.error("EcoTrackX signup error:",error);
        showAuthMessage("signupMessage","Something went wrong. Please try again.",true);
    }
}

async function verifySignupOtp(event){
    event.preventDefault();

    const token = document.getElementById("signupOtp").value.trim().replace(/\s+/g,"");
    if(!pendingSignupEmail){
        showAuthMessage("verifyOtpMessage","Your signup session has expired. Please sign up again or request a new code.",true);
        return;
    }
    if(!/^\d{8}$/.test(token)){
        showAuthMessage("verifyOtpMessage","Enter the 8-digit code from your email.",true);
        return;
    }

    showAuthMessage("verifyOtpMessage","Verifying your email...");

    try{
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: pendingSignupEmail,
            token,
            type: "signup"
        });

        if(error){
            showAuthMessage("verifyOtpMessage","That code is invalid or expired. Try again or resend a new code.",true);
            return;
        }

        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        const verifiedUser = sessionData?.session?.user || data?.user || data?.session?.user || null;

        if (sessionError || !verifiedUser) {
            showAuthMessage(
                "verifyOtpMessage",
                "Your email was verified, but no active login session was found. Please log in with your email and password.",
                true
            );
            return;
        }

        currentEcoTrackUser = verifiedUser;
        pendingSignupEmail = "";
        document.getElementById("signupOtp").value = "";
        updateLoggedInUI(verifiedUser);
        showAuthMessage("verifyOtpMessage","Email verified successfully. Opening EcoTrackX...");

        setTimeout(async () => {
            const authPage = document.getElementById("authPage");
            const explorePage = document.getElementById("explorePage");
            if (authPage) {
                authPage.classList.remove("show");
                authPage.setAttribute("aria-hidden", "true");
            }
            if (explorePage) {
                explorePage.classList.remove("show");
                explorePage.setAttribute("aria-hidden", "true");
            }
            document.getElementById("siteShell").style.display = "block";
            history.replaceState({ home: true }, "", location.pathname + location.search + "#home");
            window.scrollTo({ top: 0, behavior: "smooth" });

            try {
                await loadCalculationHistory();
            } catch (historyError) {
                console.error("Unable to load calculation history after signup:", historyError);
            }
        }, 500);

    }catch(error){
        console.error("EcoTrackX OTP verification error:",error);
        showAuthMessage("verifyOtpMessage","Unable to verify the code right now. Please try again.",true);
    }
}

async function resendSignupOtp(){
    if(!pendingSignupEmail){
        showAuthMessage("verifyOtpMessage","Please sign up again to request a verification code.",true);
        return;
    }

    showAuthMessage("verifyOtpMessage","Sending a new verification code...");

    try{
        const { error } = await supabaseClient.auth.resend({
            type: "signup",
            email: pendingSignupEmail
        });

        if(error){
            showAuthMessage("verifyOtpMessage",error.message,true);
            return;
        }

        document.getElementById("signupOtp").value = "";
        showAuthMessage("verifyOtpMessage","A new code has been sent to " + pendingSignupEmail + ".");
    }catch(error){
        console.error("EcoTrackX resend OTP error:",error);
        showAuthMessage("verifyOtpMessage","Could not resend the code. Please wait a moment and try again.",true);
    }
}


async function forgotPassword(event){
    event.preventDefault();

    const email = document.getElementById("forgotEmail").value.trim();
    if(!email){
        showAuthMessage("forgotMessage", "Enter your registered email address.", true);
        return;
    }

    showAuthMessage("forgotMessage", "Sending verification code...");

    try{
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if(error) throw error;

        pendingPasswordResetEmail = email;
        document.getElementById("resetEmailOtp").value = "";
        hideAuthCards();
        document.getElementById("resetOtpCard").style.display = "block";
        clearAuthMessages();
        showAuthMessage("resetOtpMessage", "Verification code sent. Check your email and enter the 8-digit code.");
    }catch(error){
        console.error("EcoTrackX password reset OTP error:", error);
        showAuthMessage("forgotMessage", error?.message || "Unable to send the verification code. Please try again.", true);
    }
}

async function verifyPasswordResetOtp(event){
    event.preventDefault();
    const token = document.getElementById("resetEmailOtp").value.trim();
    if(!pendingPasswordResetEmail){
        showAuthMessage("resetOtpMessage", "Please request a new code using your email address.", true);
        return;
    }
    if(!/^\d{8}$/.test(token)){
        showAuthMessage("resetOtpMessage", "Enter the 8-digit code from your email.", true);
        return;
    }

    const button = document.getElementById("verifyResetOtpBtn");
    button.disabled = true;
    button.textContent = "Verifying...";
    showAuthMessage("resetOtpMessage", "Verifying your code...");
    try{
        const { error } = await supabaseClient.auth.verifyOtp({
            email: pendingPasswordResetEmail,
            token,
            type: "recovery"
        });
        if(error) throw error;
        document.getElementById("resetEmailOtp").value = "";
        openResetPasswordPage();
    }catch(error){
        console.error("EcoTrackX password reset OTP verification error:", error);
        showAuthMessage("resetOtpMessage", error?.message || "That code could not be verified. Request a fresh code and try again.", true);
    }finally{
        button.disabled = false;
        button.textContent = "Verify Code";
    }
}

async function resendPasswordResetOtp(){
    if(!pendingPasswordResetEmail){
        showAuthMessage("resetOtpMessage", "Please go back and enter your email address.", true);
        return;
    }
    showAuthMessage("resetOtpMessage", "Sending a new code...");
    try{
        const { error } = await supabaseClient.auth.resetPasswordForEmail(pendingPasswordResetEmail);
        if(error) throw error;
        document.getElementById("resetEmailOtp").value = "";
        showAuthMessage("resetOtpMessage", "A new verification code has been sent. Use the newest email.");
    }catch(error){
        console.error("EcoTrackX resend password reset OTP error:", error);
        showAuthMessage("resetOtpMessage", error?.message || "Could not resend the code. Please try again later.", true);
    }
}

async function saveNewPassword(event){
    event.preventDefault();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmNewPassword").value;
    const button = document.getElementById("saveNewPasswordBtn");

    if(password.length < 6){
        showAuthMessage("resetPasswordMessage", "Your password must be at least 6 characters long.", true);
        return;
    }
    if(password !== confirmPassword){
        showAuthMessage("resetPasswordMessage", "The passwords do not match. Please try again.", true);
        return;
    }

    button.disabled = true;
    button.textContent = "Updating Password...";
    showAuthMessage("resetPasswordMessage", "Updating your password...");

    try{
        const { data, error } = await supabaseClient.auth.updateUser({ password });
        if(error) throw error;

        document.getElementById("newPassword").value = "";
        document.getElementById("confirmNewPassword").value = "";
        showAuthMessage("resetPasswordMessage", "Your password has been updated successfully. You can now log in with your new password.");

        const cleanUrl = `${window.location.origin}${window.location.pathname}#login`;
        history.replaceState({login:true}, "", cleanUrl);
        setTimeout(() => {
            hideAuthCards();
            document.getElementById("loginCard").style.display = "block";
            clearAuthMessages();
            showAuthMessage("loginMessage", "Password updated successfully. Please log in with your new password.");
        }, 1800);
    }catch(error){
        console.error("EcoTrackX password update error:", error);
        showAuthMessage("resetPasswordMessage", error?.message || "Could not update the password. Please reopen the latest reset link and try again.", true);
    }finally{
        button.disabled = false;
        button.textContent = "Update Password";
    }
}

function toggleMenu(){

    document
        .getElementById("navLinks")
        .classList.toggle("show");

}



document
    .querySelectorAll(".nav-close")
    .forEach(link => {

        link.addEventListener("click", function(){

            document
                .getElementById("navLinks")
                .classList.remove("show");

        });

    });


function toggleCalculator(){
    const form = document.getElementById("calculatorForm");
    const button = document.getElementById("calculatorToggle");
    const icon = document.getElementById("calculatorToggleIcon");
    if(!form) return;

    const open = form.classList.toggle("open");
    if(button){
        button.setAttribute("aria-expanded", open ? "true" : "false");
        if(button.firstChild && button.firstChild.nodeType === Node.TEXT_NODE){
            button.firstChild.textContent = open ? "Hide " : "Calculate ";
        }
    }
    if(icon) icon.textContent = open ? "−" : "＋";

    if(open){
        setTimeout(()=>form.scrollIntoView({behavior:"smooth",block:"nearest"}),80);
    }
}

function calculateFootprint(){

    const car =
        Math.max(
            0,
            Number(document.getElementById("car").value) || 0
        );

    const bike =
        Math.max(
            0,
            Number(document.getElementById("bike").value) || 0
        );

    const publicTransport =
        Math.max(
            0,
            Number(
                document.getElementById("publicTransport").value
            ) || 0
        );

    const electricity =
        Math.max(
            0,
            Number(
                document.getElementById("electricity").value
            ) || 0
        );

    const flights =
        Math.max(
            0,
            Number(
                document.getElementById("flights").value
            ) || 0
        );

    const diet =
        Number(
            document.getElementById("diet").value
        );

    const waste =
        Number(
            document.getElementById("waste").value
        );

    /* ---------- DAILY TRANSPORT ---------- */
    const dailyCarEmission =
        car * 0.17;

    const dailyBikeEmission =
        bike * 0.10;

    const dailyPublicEmission =
        publicTransport * 0.04;


    /* ---------- MONTHLY TRANSPORT ---------- */

    const monthlyCarEmission =
        dailyCarEmission * 30;

    const monthlyBikeEmission =
        dailyBikeEmission * 30;

    const monthlyPublicEmission =
        dailyPublicEmission * 30;


    const monthlyTransport =
        monthlyCarEmission +
        monthlyBikeEmission +
        monthlyPublicEmission;


    /* ---------- YEARLY TRANSPORT ---------- */

    const yearlyTransport =
        monthlyTransport * 12;


    /* ---------- ELECTRICITY ---------- */

    const monthlyElectricity =
        electricity * 0.70;

    const yearlyElectricity =
        monthlyElectricity * 12;


    /* ---------- FLIGHTS ---------- */

    const monthlyFlightEmission =
        flights * 500;

    const yearlyFlights =
        monthlyFlightEmission * 12;


    /* ---------- FOOD ---------- */

    const yearlyFood =
        diet * 1000;


    /* ---------- WASTE ---------- */

    const yearlyWaste =
        waste * 300;


    /* ---------- TOTAL ---------- */

    const monthlyFood =
        yearlyFood / 12;

    const monthlyWaste =
        yearlyWaste / 12;


    const monthlyTotal =
        monthlyTransport +
        monthlyElectricity +
        monthlyFlightEmission +
        monthlyFood +
        monthlyWaste;


    const yearlyTotal =
        yearlyTransport +
        yearlyElectricity +
        yearlyFlights +
        yearlyFood +
        yearlyWaste;



    let score =
        Math.round(
            100 -
            (yearlyTotal / 10000) * 100
        );


    score =
        Math.max(
            10,
            Math.min(100,score)
        );


    /* ---------- ECO LEVEL ---------- */

    let level = "";
    let message = "";
    let levelIcon = "🌱";
    let nextMilestone = "Keep building your green habits.";
    let progressText = "Starting point";
    let levelProgress = score;

    if(score >= 90){
        level = "Earth Hero";
        levelIcon = "🌍";
        message = "Outstanding! Your estimated footprint is especially low.";
        nextMilestone = "You've reached the highest EcoTrack milestone.";
        progressText = "Max level";
        levelProgress = 100;
    }else if(score >= 80){
        level = "Planet Guardian";
        levelIcon = "🛡️";
        message = "Amazing progress! Your choices show a strong sustainability focus.";
        nextMilestone = "Push toward Earth Hero with a few more reductions.";
        progressText = "Next: Earth Hero";
    }else if(score >= 70){
        level = "Eco Champion";
        levelIcon = "🏆";
        message = "Great work! You're making meaningful low-impact choices.";
        nextMilestone = "Keep improving to reach Planet Guardian.";
        progressText = "Next: Planet Guardian";
    }else if(score >= 55){
        level = "Green Explorer";
        levelIcon = "🧭";
        message = "You're moving in the right direction. There is plenty of room to improve.";
        nextMilestone = "Focus on your biggest emission category next.";
        progressText = "Next: Eco Champion";
    }else{
        level = "Eco Starter";
        levelIcon = "🌱";
        message = "Every journey starts somewhere. Pick one practical change and track it.";
        nextMilestone = "Build consistent habits and reach Green Explorer.";
        progressText = "Next: Green Explorer";
        levelProgress = Math.max(8, score);
    }


    /* ================= CALCULATION DATE ================= */

    const now =
        new Date();

    const calculationDate =
        now.toLocaleDateString(
            "en-IN",
            {
                day:"numeric",
                month:"long",
                year:"numeric"
            }
        );


    /* ================= RESULTS ================= */

    document
        .getElementById("monthlyResult")
        .textContent =
        Math.round(monthlyTotal)
        .toLocaleString();


    document
        .getElementById("co2Result")
        .textContent =
        Math.round(yearlyTotal)
        .toLocaleString();


    document
        .getElementById("calculationDate")
        .textContent =
        calculationDate;


    document
        .getElementById("scoreResult")
        .textContent =
        score;


    document
        .getElementById("levelResult")
        .textContent =
        level;

    document.getElementById("levelIcon").textContent = levelIcon;
    document.getElementById("levelProgressText").textContent = progressText;
    document.getElementById("levelProgressFill").style.width = Math.max(0,Math.min(100,levelProgress)) + "%";
    document.getElementById("levelNext").textContent = nextMilestone;

    document
        .getElementById("levelText")
        .textContent =
        message;


    document
        .getElementById("scoreMessage")
        .textContent =
        message;


    document
        .getElementById("results")
        .style.display =
        "block";


    /* ================= SCORE CIRCLE ================= */

    const degrees =
        score * 3.6;

    document
        .getElementById("scoreCircle")
        .style.background =
        `conic-gradient(
            var(--green) ${degrees}deg,
            #dcebe2 ${degrees}deg
        )`;


    /* ================= EMISSION BREAKDOWN ================= */

    const categories = {

        transport:
            yearlyTransport,

        energy:
            yearlyElectricity,

        food:
            yearlyFood,

        travel:
            yearlyFlights,

        waste:
            yearlyWaste

    };


    const total =
        Object.values(categories)
        .reduce(
            (sum,value) => sum + value,
            0
        );

    renderActionSteps(categories,diet,waste);


    const transportPercent =
        total > 0
        ? (categories.transport / total) * 100
        : 0;

    const energyPercent =
        total > 0
        ? (categories.energy / total) * 100
        : 0;

    const foodPercent =
        total > 0
        ? (categories.food / total) * 100
        : 0;

    const travelPercent =
        total > 0
        ? (categories.travel / total) * 100
        : 0;

    const wastePercent =
        total > 0
        ? (categories.waste / total) * 100
        : 0;


    /* ---------- UPDATE TEXT ---------- */

    document
        .getElementById("transportPercent")
        .textContent =
        transportPercent.toFixed(1) + "%";


    document
        .getElementById("energyPercent")
        .textContent =
        energyPercent.toFixed(1) + "%";


    document
        .getElementById("foodPercent")
        .textContent =
        foodPercent.toFixed(1) + "%";


    document
        .getElementById("travelPercent")
        .textContent =
        travelPercent.toFixed(1) + "%";


    document
        .getElementById("wastePercent")
        .textContent =
        wastePercent.toFixed(1) + "%";


    /* ---------- UPDATE BARS ---------- */

    document
        .getElementById("transportBar")
        .style.width =
        transportPercent + "%";


    document
        .getElementById("energyBar")
        .style.width =
        energyPercent + "%";


    document
        .getElementById("foodBar")
        .style.width =
        foodPercent + "%";


    document
        .getElementById("travelBar")
        .style.width =
        travelPercent + "%";


    document
        .getElementById("wasteBar")
        .style.width =
        wastePercent + "%";


    /* ================= DASHBOARD ================= */

    document
        .getElementById("dashboardDate")
        .textContent =
        calculationDate;


    document
        .getElementById("dashboardScore")
        .textContent =
        score;


    document
        .getElementById("dashboardLevel")
        .textContent =
        level + " " + levelIcon;


    document
        .getElementById("dashboardMessage")
        .textContent =
        message;


    document
        .getElementById("dashboardTotal")
        .textContent =
        Math.round(yearlyTotal)
        .toLocaleString();


    /* ================= HERO UPDATE ================= */

    document
        .getElementById("heroScore")
        .textContent ="41 / 100";


    document
        .getElementById("heroFootprint")
        .textContent ="28%";


    /* ================= SAVE LOGGED-IN USER CALCULATION ================= */

    const dietName =
        document.getElementById("diet")
        .options[
            document.getElementById("diet").selectedIndex
        ].text;

    const wasteName =
        document.getElementById("waste")
        .options[
            document.getElementById("waste").selectedIndex
        ].text;

    saveCalculation({
        car:car,
        bike:bike,
        publicTransport:publicTransport,

        electricity:electricity,
        flights:flights,

        dietName:dietName,
        wasteName:wasteName,

        monthlyTotal:monthlyTotal,
        yearlyTotal:yearlyTotal,

        score:score,
        level:level,

        transportEmission:yearlyTransport,
        energyEmission:yearlyElectricity,
        flightEmission:yearlyFlights,
        foodEmission:yearlyFood,
        wasteEmission:yearlyWaste
    });

    /* ================= SHOW DASHBOARD ================= */

    document
        .getElementById("results")
        .scrollIntoView({
            behavior:"smooth",
            block:"center"
        });

}


/* ================= IMMEDIATE ACTION LOGIC ================= */
function renderActionSteps(categories,dietValue,wasteValue){const container=document.getElementById("actionCards");if(!container)return;const actions=[];const sorted=Object.entries(categories).sort((a,b)=>b[1]-a[1]);const t={transport:{icon:"🚗",title:"Reduce your transport impact",text:"Your transportation is one of your larger contributors. When practical, replace some short car or motorbike trips with walking, cycling or public transport.",tag:"Transportation"},energy:{icon:"⚡",title:"Cut unnecessary electricity use",text:"Your electricity use is a major contributor. Switch off unused devices, reduce avoidable cooling or heating and choose efficient appliances when replacing them.",tag:"Energy"},food:{icon:"🥗",title:"Try lower-impact meals",text:"Your diet contributes noticeably to the estimate. Consider adding more plant-based meals and reducing high-emission food choices.",tag:"Food"},travel:{icon:"✈️",title:"Review your flights",text:"Air travel has a large effect on your estimate. For suitable journeys, consider lower-emission travel options and avoid unnecessary flights.",tag:"Travel"},waste:{icon:"♻️",title:"Reduce and separate waste",text:"Reuse items, avoid unnecessary single-use products and separate recyclable material where local systems support it.",tag:"Waste"}};sorted.forEach(([key,value])=>{if(value>0&&actions.length<3)actions.push(t[key]);});if(Number(dietValue)>=2.3&&!actions.find(a=>a.tag==="Food")&&actions.length<3)actions.push(t.food);if(Number(wasteValue)>=1.4&&!actions.find(a=>a.tag==="Waste")&&actions.length<3)actions.push(t.waste);while(actions.length<3){const f=[t.transport,t.energy,t.waste].find(a=>!actions.find(x=>x.tag===a.tag));if(!f)break;actions.push(f);}container.innerHTML=actions.slice(0,3).map(a=>`<div class="action-card"><div class="action-icon">${a.icon}</div><h3>${a.title}</h3><p>${a.text}</p><span class="action-tag">Priority • ${a.tag}</span></div>`).join("");}

const climateData = {
    global: { period: "1990–2019", latestYear: "2019", latestValue: "59 ± 6.6 GtCO₂e", source: "IPCC AR6 WGIII" },
    india: { reviewDate: "9 September 2026", netZero: "2070", nonFossilTarget: "500 GW by 2030", intensityTarget: "45% reduction from 2005 level by 2030" }
};

function openExplore(push=true){document.getElementById("siteShell").style.display="none";const page=document.getElementById("explorePage");page.classList.add("show");page.setAttribute("aria-hidden","false");window.scrollTo({top:0,behavior:"instant"});if(push&&location.hash!=="#explore")history.pushState({explore:true},"","#explore");}
function closeExplore(){const page=document.getElementById("explorePage");page.classList.remove("show");page.setAttribute("aria-hidden","true");document.getElementById("siteShell").style.display="block";if(location.hash==="#explore")history.back();window.scrollTo({top:0,behavior:"smooth"});}
function closeExploreAndGoToCalculator(){if(location.hash==="#explore")history.back();else closeExplore();setTimeout(()=>document.getElementById("calculator").scrollIntoView({behavior:"smooth"}),250);}
window.addEventListener("popstate",()=>{
    if(location.hash==="#explore"){
        openExplore(false);
    }else if(location.hash==="#login" || location.hash==="#signup" || location.hash==="#forgot"){
        openLogin(false);

        if(location.hash==="#signup"){
            showSignup();
        }else if(location.hash==="#forgot"){
            showForgotPassword();
        }else{
            showLogin();
        }
    }else{
        document.getElementById("explorePage").classList.remove("show");
        document.getElementById("explorePage").setAttribute("aria-hidden","true");
        document.getElementById("authPage").classList.remove("show");
        document.getElementById("authPage").setAttribute("aria-hidden","true");
        document.getElementById("siteShell").style.display="block";
    }
});

if(new URLSearchParams(window.location.search).get("reset-password") === "1"){
    openLogin(false);
}

if(location.hash==="#explore") openExplore(false);
if(location.hash==="#login") openLogin(false);
if(location.hash==="#signup"){
    openLogin(false);
    showSignup();
}
if(location.hash==="#forgot"){
    openLogin(false);
    showForgotPassword();
}
/* ================= FAQ ================= */

document
    .querySelectorAll(".faq-question")
    .forEach(question => {

        question.addEventListener(
            "click",
            () => {

                const item =
                    question.parentElement;

                item.classList.toggle("active");


                const symbol =
                    question.querySelector("span");


                symbol.textContent =
                    item.classList.contains("active")
                    ? "−"
                    : "+";

            }
        );

    });

/* ================= 3D EARTH ================= */
async function init3DEarth(){
    const mount = document.getElementById("earth3d");
    const fallback = document.getElementById("earthFallback");
    if(!mount) return;

    try{
        const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
        const {OrbitControls} = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js");

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            35,
            1,
            0.1,
            100
        );

        camera.position.set(0, 0, 9.0);

        const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000,0);
        mount.innerHTML = "";
        mount.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0x9edcff,1.7);
        scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff,3.2);
        sun.position.set(-4,2,5);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x39d98a,1.2);
        rim.position.set(4,-2,-4);
        scene.add(rim);

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        const earthTexture = loader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
        earthTexture.colorSpace = THREE.SRGBColorSpace;

        const earth = new THREE.Mesh(
            new THREE.SphereGeometry(2.05,96,96),
            new THREE.MeshPhongMaterial({map:earthTexture,specular:0x224466,shininess:18})
        );
        scene.add(earth);

        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(2.13,64,64),
            new THREE.MeshBasicMaterial({color:0x48d7b0,transparent:true,opacity:.08,side:THREE.BackSide,blending:THREE.AdditiveBlending})
        );
        scene.add(atmosphere);

        const controls = new OrbitControls(camera,renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.045;
        controls.enablePan = false;
        controls.enableZoom = false;
       

        controls.minPolarAngle = 0.12;
        controls.maxPolarAngle = Math.PI - 0.12;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.45;

        renderer.domElement.addEventListener("pointerdown",()=>{controls.autoRotate=false;},{passive:true});
        renderer.domElement.addEventListener("pointerup",()=>{setTimeout(()=>{controls.autoRotate=true;},900);},{passive:true});
        renderer.domElement.addEventListener("pointercancel",()=>{controls.autoRotate=true;},{passive:true});

        function resize(){
            const w = Math.max(1,mount.clientWidth);
            const h = Math.max(1,mount.clientHeight);
            camera.aspect = w/h;
            camera.updateProjectionMatrix();
            renderer.setSize(w,h,false);
        }
        resize();
        window.addEventListener("resize",resize);

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if(reduceMotion) controls.autoRotate = false;

        let frame = 0;
        function animate(){
            frame = requestAnimationFrame(animate);
            controls.update();
            earth.rotation.y += 0.00035;
            atmosphere.rotation.y += 0.00015;
            renderer.render(scene,camera);
        }
        animate();

        if(fallback) fallback.style.display="none";
    }catch(error){
        console.warn("3D Earth could not load; using visual fallback.",error);
        if(fallback) fallback.style.display="block";
    }
}

init3DEarth();

/* ================= APPLICATION STARTUP ================= */

initializeEcoTrackAuth();
