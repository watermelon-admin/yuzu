# 🧾 SSH + Gitea on Windows — Setup Cheat Sheet

This guide walks you through setting up SSH key-based Git access for Gitea on a new Windows dev machine.

---

## 🧰 Requirements

- [Git for Windows](https://git-scm.com/download/win) (includes Git Bash and OpenSSH)
- A working Gitea account
- Access to Gitea Web UI

---

## 1. ✅ Generate an SSH key pair (Git Bash)

Open **Git Bash** and run:

```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

When prompted:

- **Save to default location**: Just press Enter  
  `> Enter file in which to save the key (/c/Users/YourUser/.ssh/id_ed25519):`
- **Enter a passphrase** for security (recommended)

---

## 2. 📋 Copy the public key

Run this to copy the key to your clipboard:

```bash
clip < ~/.ssh/id_ed25519.pub
```

Or manually open it:

```bash
cat ~/.ssh/id_ed25519.pub
```

---

## 3. 🖥️ Add the key to Gitea

1. Go to your Gitea web UI (e.g., `https://git.example.com`)
2. Log in, click your avatar → **Settings**
3. Go to **SSH / GPG Keys** → **Add Key**
4. Paste the contents of `id_ed25519.pub`
5. Give it a name (e.g., `My Windows PC`)

---

## 4. 🚀 Start the SSH agent & load your key

In Git Bash, start the agent:

```bash
eval $(ssh-agent -s)
```

Add your private key (you'll enter your passphrase once):

```bash
ssh-add ~/.ssh/id_ed25519
```

✅ It should say: `Identity added`

---

## 5. 🧠 Ensure Git uses the right SSH client

This is normally automatic with Git for Windows. If you want to double check:

```bash
git config --global core.sshCommand "ssh"
```

Or to use the full path:

```bash
git config --global core.sshCommand "C:/Program Files/Git/usr/bin/ssh.exe"
```

---

## 6. 🔁 Clone a repo using SSH

In Gitea, use the **SSH clone URL** format:

```bash
git clone git@gitea.example.com:username/repo.git
```

---

## 7. 🛠️ Troubleshooting

### 💬 Still being asked for your passphrase every time?

You likely need to make sure the SSH agent is running. You can:

- Add your key to the agent manually:  
  `ssh-add ~/.ssh/id_ed25519`

- Or create a shortcut that launches Git Bash with the agent and adds the key on startup.

### 🧪 Test SSH connection to Gitea

```bash
ssh -T git@gitea.example.com
```

Expected output (first time, you'll approve the host):

```bash
Hi username! You've successfully authenticated, but Gitea does not provide shell access.
```

---
