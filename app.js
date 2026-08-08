document.addEventListener('DOMContentLoaded', () => {
    const coverPage = document.getElementById('cover-page');
    const mainContent = document.getElementById('main-content');
    const btnOpen = document.getElementById('btn-open');
    const btnShareCover = document.getElementById('btn-share-cover');
    const btnShareInvite = document.getElementById('btn-share-invite');
    const btnSaveDate = document.getElementById('btn-save-date');
    const btnCopyMaps = document.getElementById('btn-copy-maps');
    const btnCopyRekening = document.getElementById('btn-copy-rekening');
    const musicControl = document.getElementById('music-control');
    const progressBar = document.getElementById('progress-bar');
    const toast = document.getElementById('toast');
    const bgMusic = document.getElementById('bg-music');
    const guestForm = document.getElementById('guest-form');
    const guestName = document.getElementById('guest-name');
    const coverGuest = document.getElementById('cover-guest');
    const guestModal = document.getElementById('guest-modal');
    const guestModalForm = document.getElementById('guest-modal-form');
    const guestModalName = document.getElementById('guest-modal-name');
    const guestModalRole = document.getElementById('guest-modal-role');
    const guestAttendance = document.getElementById('guest-attendance');
    const guestMessage = document.getElementById('guest-message');
    const guestSubmitButton = guestForm ? guestForm.querySelector('button[type="submit"]') : null;
    const wishesContainer = document.getElementById('wishes-container');
    const wishCount = document.getElementById('wish-count');
    const copyLocationButtons = document.querySelectorAll('.js-copy-location');
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    const storageKey = 'zr-wishes-v2';
    const guestProfileKey = 'zr-guest-profile-v1';
    const eventStart = new Date('2026-08-21T14:00:00+07:00');
    const eventReception = new Date('2026-08-23T10:00:00+07:00');
    const copyLocationText = 'Akad Nikah: Jorong Koto Tangah, Lapangan Bola Kaki, Buluh Kasok. Resepsi: Jorong Sungai Jodi Lubuk Tarok.';
    let isPlaying = false;
    let shouldResumeOnVisible = false;
    let toastTimer = null;
    let editingWishId = null;

    const defaultWishes = [
        {
            id: 'default-1',
            name: 'Sahabat',
            attendance: 'Ya, saya hadir',
            emoji: '😊',
            message: 'Semoga hari ini menjadi awal rumah yang tenang, hangat, dan dipenuhi keberkahan.'
        },
        {
            id: 'default-2',
            name: 'Keluarga',
            attendance: 'Ya, saya hadir',
            emoji: '🤍',
            message: 'Doa terbaik untuk Zilvia dan Rival, semoga Allah menjaga cinta kalian dalam setiap langkah.'
        }
    ];

    const storedWishes = readWishes();
    const supportsClipboard = navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
    const supportsShare = typeof navigator.share === 'function';
    const supportsDownload = 'download' in HTMLAnchorElement.prototype;

    function readWishes() {
        try {
            const wishes = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return Array.isArray(wishes) ? wishes : [];
        } catch {
            return [];
        }
    }

    function writeWishes(wishes) {
        localStorage.setItem(storageKey, JSON.stringify(wishes));
    }

    function normalizeGuestName(value) {
        return String(value || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function readGuestProfileFromUrl() {
        const segments = window.location.pathname
            .split('/')
            .map((segment) => normalizeGuestName(decodeURIComponent(segment)))
            .filter(Boolean);

        const guestIndex = segments.findIndex((segment) => segment.toLowerCase() === 'nama');
        if (guestIndex === -1 || !segments[guestIndex + 1]) {
            return null;
        }

        const name = normalizeGuestName(segments[guestIndex + 1]);
        if (!name) {
            return null;
        }

        return {
            name,
            role: ''
        };
    }

    function readGuestProfile() {
        try {
            const profile = JSON.parse(localStorage.getItem(guestProfileKey) || 'null');
            if (!profile || typeof profile !== 'object') return null;
            return typeof profile.name === 'string' && profile.name.trim() ? profile : null;
        } catch {
            return null;
        }
    }

    function writeGuestProfile(profile) {
        localStorage.setItem(guestProfileKey, JSON.stringify(profile));
    }

    function updateCoverGuest(name) {
        if (!coverGuest) return;
        coverGuest.textContent = name;
    }

    function closeGuestModal() {
        if (!guestModal) return;
        guestModal.hidden = true;
        document.body.classList.remove('modal-open');
    }

    function openGuestModal() {
        if (!guestModal) return;
        guestModal.hidden = false;
        document.body.classList.add('modal-open');
        window.requestAnimationFrame(() => {
            guestModalName?.focus();
        });
    }

    function applyGuestProfile(profile) {
        if (!profile || !profile.name) return;
        updateCoverGuest(profile.name);
        if (guestName && !guestName.value) {
            guestName.value = profile.name;
        }
    }

    function handleGuestProfileSubmit(event) {
        event.preventDefault();

        const name = guestModalName?.value.trim() || '';
        const role = guestModalRole?.value.trim() || '';

        if (!name) {
            showToast('Nama harus diisi terlebih dahulu.');
            guestModalName?.focus();
            return;
        }

        const profile = { name, role };
        writeGuestProfile(profile);
        applyGuestProfile(profile);
        closeGuestModal();
    }

    function createWishId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `wish-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function formatTwoDigits(value) {
        return String(value).padStart(2, '0');
    }

    function showToast(message) {
        if (!toast) return;
        toast.innerHTML = message;
        toast.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toast.classList.remove('show');
        }, 2400);
    }

    function updateMusicIcon() {
        if (!musicControl) return;
        musicControl.innerHTML = isPlaying
            ? '<i class="fa-solid fa-pause"></i>'
            : '<i class="fa-solid fa-music"></i>';
        musicControl.setAttribute('aria-pressed', String(isPlaying));
    }

    async function tryPlayMusic() {
        try {
            await bgMusic.play();
            isPlaying = true;
            shouldResumeOnVisible = true;
            updateMusicIcon();
        } catch {
            isPlaying = false;
            updateMusicIcon();
        }
    }

    function pauseMusic(keepResumeState = false) {
        bgMusic.pause();
        isPlaying = false;
        if (!keepResumeState) {
            shouldResumeOnVisible = false;
        }
        updateMusicIcon();
    }

    async function resumeMusic() {
        if (!shouldResumeOnVisible || !bgMusic.paused) return;

        try {
            await bgMusic.play();
            isPlaying = true;
            shouldResumeOnVisible = true;
            updateMusicIcon();
        } catch {
            isPlaying = false;
            updateMusicIcon();
        }
    }

    function openInvitation() {
        if (!coverPage || !mainContent) return;
        coverPage.classList.add('is-leaving');
        setTimeout(() => {
            coverPage.style.display = 'none';
            document.body.style.overflow = 'auto';
            mainContent.classList.remove('hidden');
            mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            revealElements.forEach((element, index) => {
                setTimeout(() => element.classList.add('is-visible'), index * 90);
            });
            tryPlayMusic();
        }, 850);
    }

    function toggleMusic() {
        if (isPlaying) {
            pauseMusic(false);
            return;
        }
        bgMusic.play().then(() => {
            isPlaying = true;
            shouldResumeOnVisible = true;
            updateMusicIcon();
        }).catch(() => {
            showToast('Browser menahan musik otomatis. Sentuh sekali lagi untuk memulai lagu.');
        });
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            if (isPlaying) {
                pauseMusic(true);
            }
            return;
        }

        resumeMusic();
    }

    function updateCountdown() {
        const target = eventReception.getTime();
        const now = Date.now();
        const distance = target - now;

        if (distance <= 0) {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = formatTwoDigits(days);
        document.getElementById('hours').textContent = formatTwoDigits(hours);
        document.getElementById('minutes').textContent = formatTwoDigits(minutes);
        document.getElementById('seconds').textContent = formatTwoDigits(seconds);
    }

    function updateProgress() {
        if (!progressBar || !mainContent || mainContent.classList.contains('hidden')) return;
        const contentHeight = mainContent.scrollHeight - window.innerHeight;
        const progress = contentHeight > 0 ? (window.scrollY / contentHeight) * 100 : 0;
        progressBar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
    }

    function getSelectedEmoji() {
        const checked = document.querySelector('input[name="emoji"]:checked');
        return checked ? checked.value : '🙂';
    }

    function resetWishForm() {
        editingWishId = null;
        guestForm.reset();
        const defaultEmoji = document.querySelector('input[name="emoji"][value="🙂"]');
        if (defaultEmoji) defaultEmoji.checked = true;
        if (guestSubmitButton) {
            guestSubmitButton.textContent = 'Kirim Ucapan';
        }
    }

    function beginEditWish(wishId) {
        const wish = storedWishes.find((item) => item.id === wishId);
        if (!wish) return;

        editingWishId = wishId;
        guestName.value = wish.name;
        guestAttendance.value = wish.attendance;
        guestMessage.value = wish.message;

        const emojiInput = document.querySelector(`input[name="emoji"][value="${wish.emoji}"]`);
        if (emojiInput) {
            emojiInput.checked = true;
        }

        if (guestSubmitButton) {
            guestSubmitButton.textContent = 'Simpan Perubahan';
        }

        guestForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('Ucapan sedang diedit. Silakan perbaiki lalu simpan.');
    }

    function deleteWish(wishId) {
        const confirmed = window.confirm('Yakin ingin menghapus ucapan ini?');
        if (!confirmed) return;

        const nextWishes = storedWishes.filter((wish) => wish.id !== wishId);
        storedWishes.length = 0;
        storedWishes.push(...nextWishes);
        writeWishes(storedWishes);

        if (editingWishId === wishId) {
            resetWishForm();
        }

        renderWishes();
        showToast('Ucapan berhasil dihapus dari daftar.');
    }

    function createWishElement(wish, isDefault = false) {
        const article = document.createElement('article');
        article.className = 'wish-item';

        const header = document.createElement('div');
        header.className = 'wish-header';

        const identity = document.createElement('div');
        const name = document.createElement('h4');
        name.className = 'wish-name';
        name.textContent = wish.name;

        const meta = document.createElement('p');
        meta.className = 'wish-meta';
        meta.textContent = `${wish.attendance}${isDefault ? ' · Doa pilihan' : ''}`;

        identity.append(name, meta);

        const emoji = document.createElement('div');
        emoji.className = 'wish-emoji';
        emoji.textContent = wish.emoji;

        const message = document.createElement('p');
        message.className = 'wish-message';
        message.textContent = wish.message;

        const actions = document.createElement('div');
        actions.className = 'wish-actions';

        if (!isDefault) {
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'wish-action-button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => beginEditWish(wish.id));

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'wish-action-button danger';
            deleteButton.textContent = 'Hapus';
            deleteButton.addEventListener('click', () => deleteWish(wish.id));

            actions.append(editButton, deleteButton);
        }

        header.append(identity, emoji);
        article.append(header, message);

        if (actions.childElementCount > 0) {
            article.append(actions);
        }

        return article;
    }

    function renderWishes() {
        if (!wishesContainer) return;
        const wishes = [...storedWishes, ...defaultWishes];
        wishesContainer.innerHTML = '';
        wishCount.textContent = String(wishes.length);

        if (!wishes.length) {
            const empty = document.createElement('div');
            empty.className = 'wish-empty';
            empty.textContent = 'Belum ada ucapan yang masuk. Mungkin Anda ingin menjadi yang pertama menitipkan doa?';
            wishesContainer.appendChild(empty);
            return;
        }

        wishes.forEach((wish, index) => {
            wishesContainer.appendChild(createWishElement(wish, index >= storedWishes.length));
        });
    }

    function downloadCalendar() {
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Zilvia & Rival//Wedding Invitation//ID',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:zr-20260823@wedding-invite',
            `DTSTAMP:${toIcsDate(new Date())}`,
            `DTSTART;TZID=Asia/Jakarta:${toIcsDate(eventReception)}`,
            `DTEND;TZID=Asia/Jakarta:${toIcsDate(new Date(eventReception.getTime() + 2 * 60 * 60 * 1000))}`,
            'SUMMARY:Resepsi Pernikahan Zilvia & Rival',
            'LOCATION:Jorong Sungai Jodi Lubuk Tarok',
            'DESCRIPTION:Undangan pernikahan Zilvia & Rival',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'zilvia-rival-wedding.ics';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast('Tanggal acara sudah siap disimpan ke kalender.');
    }

    function toIcsDate(date) {
        const pad = (value) => String(value).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    }

    async function shareInvitation() {
        const title = 'The Wedding of Zilvia & Rival';
        const text = 'Kami mengundang Anda untuk hadir di hari bahagia Zilvia & Rival pada 23 Agustus 2026.';
        const url = window.location.href;

        if (supportsShare) {
            try {
                await navigator.share({ title, text, url });
                showToast('Undangan berhasil dibagikan.');
                return;
            } catch {
                // fallback to copy
            }
        }

        const payload = `${title}\n${text}\n${url}`;
        await copyText(payload);
        showToast('Tautan undangan sudah disalin.');
    }

    async function copyText(value) {
        if (supportsClipboard) {
            await navigator.clipboard.writeText(value);
            return;
        }

        const fallback = document.createElement('textarea');
        fallback.value = value;
        fallback.setAttribute('readonly', 'true');
        fallback.style.position = 'fixed';
        fallback.style.opacity = '0';
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand('copy');
        fallback.remove();
    }

    async function copyLocation() {
        await copyText(copyLocationText);
        showToast('Lokasi acara sudah disalin.');
    }

    async function copyBankNumber() {
        const rekening = document.getElementById('rekening-number').textContent.trim();
        await copyText(rekening);
        showToast('Nomor rekening sudah disalin.');
    }

    async function copyLocationCard(value) {
        await copyText(value);
        showToast('Lokasi sudah disalin.');
    }

    function submitRSVP(event) {
        event.preventDefault();
        const wasEditing = Boolean(editingWishId);

        const name = guestName.value.trim();
        const attendance = guestAttendance.value;
        const emoji = getSelectedEmoji();
        const message = guestMessage.value.trim();

        if (!name || !message) {
            showToast('Mohon lengkapi nama dan pesan terlebih dahulu.');
            return;
        }

        const wishPayload = {
            id: editingWishId || createWishId(),
            name,
            attendance,
            emoji,
            message
        };

        if (editingWishId) {
            const targetIndex = storedWishes.findIndex((wish) => wish.id === editingWishId);
            if (targetIndex >= 0) {
                storedWishes[targetIndex] = wishPayload;
            }
        } else {
            storedWishes.unshift(wishPayload);
        }

        writeWishes(storedWishes);
        renderWishes();
        resetWishForm();
        showToast(wasEditing ? 'Ucapan Anda sudah diperbarui.' : 'Ucapan Anda sudah terkirim. Terima kasih atas doanya.');
        wishesContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindRevealObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.14 });

        revealElements.forEach((element) => observer.observe(element));
    }

    function bindEmojiStyles() {
        document.querySelectorAll('.emoji-grid input').forEach((input) => {
            input.addEventListener('change', () => {
                document.querySelectorAll('.emoji-grid label').forEach((label) => {
                    label.dataset.selected = 'false';
                });
            });
        });
    }

    btnOpen?.addEventListener('click', openInvitation);
    btnShareCover?.addEventListener('click', shareInvitation);
    btnShareInvite?.addEventListener('click', shareInvitation);
    btnSaveDate?.addEventListener('click', downloadCalendar);
    btnCopyMaps?.addEventListener('click', copyLocation);
    btnCopyRekening?.addEventListener('click', copyBankNumber);
    musicControl?.addEventListener('click', toggleMusic);
    guestForm?.addEventListener('submit', submitRSVP);
    guestModalForm?.addEventListener('submit', handleGuestProfileSubmit);
    copyLocationButtons.forEach((button) => {
        button.addEventListener('click', () => copyLocationCard(button.dataset.copyText || ''));
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    renderWishes();
    updateCountdown();
    updateMusicIcon();
    bindRevealObserver();
    bindEmojiStyles();
    updateProgress();
    setInterval(updateCountdown, 1000);

    const guestProfile = readGuestProfileFromUrl() || readGuestProfile();
    if (guestProfile) {
        writeGuestProfile(guestProfile);
        applyGuestProfile(guestProfile);
    } else {
        openGuestModal();
    }

    window.openInvitation = openInvitation;
    window.toggleAudio = toggleMusic;
    window.copyRekening = copyBankNumber;
    window.submitRSVP = submitRSVP;
});
