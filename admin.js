(() => {
  const $ = (selector) => document.querySelector(selector);
  const panel = $("#p-admin");
  if (!panel) return;

  const client = window.gailSupabase;
  const login = $("#admin-login");
  const dashboard = $("#admin-dashboard");
  const status = $("#admin-status");
  const contentList = $("#admin-content-list");
  const feedbackList = $("#admin-feedback-list");
  const researchList = $("#admin-research-list");
  let editingContentId = "";
  let authVersion = 0;
  const setupMessage =
    window.GAIL_SUPABASE_CONFIG?.url && window.GAIL_SUPABASE_CONFIG?.anonKey
      ? "Supabase SDK tidak dapat dimuat. Periksa koneksi internet lalu muat ulang."
      : "Isi URL dan anon key Supabase di supabase-config.js, lalu jalankan supabase-schema.sql.";

  const pages = [
    ["beranda", "Beranda"],
    ["panduan", "Panduan"],
    ["model", "Model"],
    ["lab", "Lab"],
    ["misi", "Misi"],
    ["kartu", "Kartu"],
    ["lacak", "Pelacak"],
    ["log", "Log AI"],
    ["asesmen", "Asesmen"],
    ["riset", "Riset"],
    ["saran", "Saran"],
    ["tentang", "Tentang"],
  ];

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.setAttribute("role", isError ? "alert" : "status");
    status.dataset.error = String(isError);
  }

  function clearList(target, message) {
    target.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "mu";
    empty.textContent = message;
    target.append(empty);
  }

  function addText(parent, tag, value) {
    const node = document.createElement(tag);
    node.textContent = value ?? "";
    parent.append(node);
    return node;
  }

  function makeButton(label, action, className = "btn o") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", () => handle(action));
    return button;
  }

  async function loadPublishedContent() {
    if (!client) return;
    const { data, error } = await client
      .from("site_content")
      .select("id,page,title,body,sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Gagal memuat konten terbitan:", error.message);
      return;
    }

    document.querySelectorAll(".dynamic-content").forEach((node) => node.remove());
    for (const item of data ?? []) {
      const page = document.querySelector(`#p-${CSS.escape(item.page)}`);
      if (!page) continue;
      let section = page.querySelector(".dynamic-content");
      if (!section) {
        section = document.createElement("section");
        section.className = "dynamic-content";
        const wrapper = document.createElement("div");
        wrapper.className = "w";
        section.append(wrapper);
        page.append(section);
      }
      const article = document.createElement("article");
      article.className = "dynamic-content-item";
      addText(article, "h2", item.title);
      addText(article, "p", item.body);
      section.querySelector(".w").append(article);
    }
  }

  function resetContentForm() {
    editingContentId = "";
    $("#content-form").reset();
    $("#content-form-title").textContent = "Tambah blok konten";
    $("#content-save").textContent = "Simpan blok";
  }

  async function loadContent() {
    const { data, error } = await client
      .from("site_content")
      .select("id,page,title,body,sort_order,is_published")
      .order("page", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;

    contentList.replaceChildren();
    if (!data?.length) {
      clearList(contentList, "Belum ada blok konten.");
      return;
    }

    for (const item of data) {
      const article = document.createElement("article");
      article.className = "admin-entry";
      const pageName = pages.find(([key]) => key === item.page)?.[1] ?? item.page;
      addText(article, "h3", item.title);
      addText(
        article,
        "p",
        `${pageName} · ${item.is_published ? "Terbit" : "Draf"} · Urutan ${item.sort_order}`,
      );
      addText(article, "p", item.body);
      article.append(
        makeButton("Ubah", () => {
          editingContentId = item.id;
          $("#content-page").value = item.page;
          $("#content-title").value = item.title;
          $("#content-body").value = item.body;
          $("#content-order").value = item.sort_order;
          $("#content-published").checked = item.is_published;
          $("#content-form-title").textContent = "Ubah blok konten";
          $("#content-save").textContent = "Simpan perubahan";
          $("#content-title").focus();
        }),
        makeButton("Hapus", async () => {
          if (!confirm(`Hapus blok "${item.title}"?`)) return;
          const { error: deleteError } = await client
            .from("site_content")
            .delete()
            .eq("id", item.id);
          if (deleteError) throw deleteError;
          await refreshDashboard();
          setStatus("Blok konten dihapus.");
        }),
      );
      contentList.append(article);
    }
  }

  async function loadFeedback() {
    const { data, error } = await client
      .from("feedback")
      .select("id,role,category,kind,message,name,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    feedbackList.replaceChildren();
    if (!data?.length) {
      clearList(feedbackList, "Belum ada masukan.");
      return;
    }

    for (const item of data) {
      const article = document.createElement("article");
      article.className = "admin-entry";
      addText(
        article,
        "h3",
        `${item.kind} · ${item.category} · ${item.role}`,
      );
      addText(
        article,
        "p",
        `${item.name || "Tanpa nama"} · ${new Date(item.created_at).toLocaleString("id-ID")}`,
      );
      addText(article, "p", item.message);
      article.append(
        makeButton("Hapus", async () => {
          if (!confirm("Hapus masukan ini?")) return;
          const { error: deleteError } = await client
            .from("feedback")
            .delete()
            .eq("id", item.id);
          if (deleteError) throw deleteError;
          await refreshDashboard();
          setStatus("Masukan dihapus.");
        }),
      );
      feedbackList.append(article);
    }
  }

  async function loadResearch() {
    const { data, error } = await client
      .from("research_results")
      .select("id,participant_count,pre_scores,post_scores,notes,is_published,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    researchList.replaceChildren();
    if (!data?.length) {
      clearList(researchList, "Belum ada hasil riset.");
      return;
    }

    for (const item of data) {
      const article = document.createElement("article");
      article.className = "admin-entry";
      addText(
        article,
        "h3",
        `${item.participant_count} peserta · ${item.is_published ? "Terbit" : "Draf"}`,
      );
      addText(
        article,
        "p",
        `Pretest: ${item.pre_scores.join(", ")} · Posttest: ${item.post_scores.join(", ")}`,
      );
      if (item.notes) addText(article, "p", item.notes);
      article.append(
        makeButton(item.is_published ? "Jadikan draf" : "Terbitkan", async () => {
          const { error: updateError } = await client
            .from("research_results")
            .update({ is_published: !item.is_published })
            .eq("id", item.id);
          if (updateError) throw updateError;
          await refreshDashboard();
          setStatus("Status publikasi hasil riset diperbarui.");
        }),
        makeButton("Hapus", async () => {
          if (!confirm("Hapus hasil riset ini?")) return;
          const { error: deleteError } = await client
            .from("research_results")
            .delete()
            .eq("id", item.id);
          if (deleteError) throw deleteError;
          await refreshDashboard();
          setStatus("Hasil riset dihapus.");
        }),
      );
      researchList.append(article);
    }
  }

  async function refreshDashboard() {
    try {
      await Promise.all([loadContent(), loadFeedback(), loadResearch()]);
    } catch (error) {
      setStatus(`Gagal memuat dashboard: ${error.message}`, true);
    }
  }

  async function setSession(session) {
    const currentVersion = ++authVersion;
    login.hidden = !!session;
    dashboard.hidden = !session;
    $("#admin-nav").hidden = true;
    if (!session) {
      setStatus(
        client
          ? "Masuk dengan akun super admin untuk membuka dashboard."
          : setupMessage,
      );
      return;
    }

    setStatus("Memeriksa akses super admin...");
    let profile;
    let error;
    try {
      const result = await client
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      profile = result.data;
      error = result.error;
    } catch (requestError) {
      error = requestError;
    }
    if (currentVersion !== authVersion) return;
    if (error) {
      login.hidden = false;
      dashboard.hidden = true;
      setStatus(`Gagal memverifikasi role: ${error.message}`, true);
      return;
    }
    if (profile?.role !== "super_admin") {
      await client.auth.signOut();
      login.hidden = false;
      dashboard.hidden = true;
      setStatus("Akun ini tidak memiliki akses super admin.", true);
      return;
    }

    $("#admin-nav").hidden = false;
    setStatus(`Masuk sebagai ${session.user.email}.`);
    await refreshDashboard();
  }

  async function handle(action) {
    try {
      await action();
    } catch (error) {
      setStatus(error.message || "Operasi gagal.", true);
    }
  }

  $("#admin-login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!client) {
      setStatus("Supabase belum dikonfigurasi.", true);
      return;
    }
    handle(async () => {
      setStatus("Sedang masuk...");
      const { error } = await client.auth.signInWithPassword({
        email: $("#admin-email").value.trim(),
        password: $("#admin-password").value,
      });
      if (error) throw error;
      $("#admin-password").value = "";
    });
  });

  $("#admin-logout").addEventListener("click", () => {
    handle(async () => {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      setStatus("Sesi admin ditutup.");
    });
  });

  $("#content-cancel").addEventListener("click", resetContentForm);
  $("#content-form").addEventListener("submit", (event) => {
    event.preventDefault();
    handle(async () => {
      if (!client) throw new Error("Supabase belum dikonfigurasi.");
      const values = {
        page: $("#content-page").value,
        title: $("#content-title").value.trim(),
        body: $("#content-body").value.trim(),
        sort_order: Number($("#content-order").value) || 0,
        is_published: $("#content-published").checked,
      };
      const query = editingContentId
        ? client.from("site_content").update(values).eq("id", editingContentId)
        : client.from("site_content").insert(values);
      const { error } = await query;
      if (error) throw error;
      resetContentForm();
      await Promise.all([loadContent(), loadPublishedContent()]);
      setStatus("Blok konten tersimpan.");
    });
  });

  $("#research-form").addEventListener("submit", (event) => {
    event.preventDefault();
    handle(async () => {
      if (!client) throw new Error("Supabase belum dikonfigurasi.");
      const preScores = Array.from({ length: 6 }, (_, index) =>
        Number($("#research-pre-" + index).value),
      );
      const postScores = Array.from({ length: 6 }, (_, index) =>
        Number($("#research-post-" + index).value),
      );
      if (
        [...preScores, ...postScores].some(
          (score) => !Number.isFinite(score) || score < 4 || score > 16,
        )
      ) {
        throw new Error("Semua skor harus berada di antara 4 dan 16.");
      }
      const { error } = await client.from("research_results").insert({
        participant_count: Number($("#research-count").value),
        pre_scores: preScores,
        post_scores: postScores,
        notes: $("#research-notes").value.trim(),
        is_published: $("#research-published").checked,
      });
      if (error) throw error;
      $("#research-form").reset();
      await Promise.all([loadResearch(), loadPublishedContent()]);
      setStatus("Hasil riset tersimpan.");
    });
  });

  $("#admin-refresh").addEventListener("click", () => {
    handle(refreshDashboard);
  });

  if (!client) {
    login.hidden = false;
    dashboard.hidden = true;
  setStatus(setupMessage);
    return;
  }

  client.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => {
    setSession(session).catch((error) =>
      setStatus(`Gagal memeriksa akses: ${error.message}`, true),
    );
  }, 0);
  });
  client.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      return setSession(data.session);
    })
    .catch((error) =>
      setStatus(`Gagal memeriksa sesi Supabase: ${error.message}`, true),
    );

  loadPublishedContent();
})();
