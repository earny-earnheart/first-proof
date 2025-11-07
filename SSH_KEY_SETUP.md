# SSH Key Setup Guide

This document describes the SSH keys generated for authentication and signing purposes.

## Generated Keys

Two key pairs have been generated in `~/.ssh/`:

### 1. Ed25519 Key Pair (Recommended)
- **Private Key**: `~/.ssh/id_ed25519`
- **Public Key**: `~/.ssh/id_ed25519.pub`
- **Algorithm**: Ed25519 (Elliptic Curve)
- **Security**: Modern, fast, and highly secure
- **Use Case**: SSH authentication, Git commit signing, token signing

### 2. RSA 4096 Key Pair (Legacy Compatibility)
- **Private Key**: `~/.ssh/id_rsa`
- **Public Key**: `~/.ssh/id_rsa.pub`
- **Algorithm**: RSA with 4096-bit key size
- **Security**: Industry standard, maximum compatibility
- **Use Case**: Systems requiring RSA, older SSH servers

## Key Locations

```
~/.ssh/
├── id_ed25519      (Private key - KEEP SECRET)
├── id_ed25519.pub  (Public key - Safe to share)
├── id_rsa          (Private key - KEEP SECRET)
└── id_rsa.pub      (Public key - Safe to share)
```

## Usage Instructions

### SSH Authentication

#### View Your Public Key
```bash
# Ed25519 (recommended)
cat ~/.ssh/id_ed25519.pub

# RSA
cat ~/.ssh/id_rsa.pub
```

#### Add to Remote Server
1. Copy your public key content
2. On the remote server, add it to `~/.ssh/authorized_keys`:
   ```bash
   echo "your-public-key-here" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

#### Connect to Remote Server
```bash
# SSH will automatically use the keys
ssh user@hostname

# Or specify a key explicitly
ssh -i ~/.ssh/id_ed25519 user@hostname
```

### Git Commit Signing

Configure Git to use SSH keys for signing commits and tags:

```bash
# Configure SSH signing globally
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

#### Sign Commits
```bash
# Commits will be automatically signed
git commit -m "Your commit message"

# Or explicitly sign
git commit -S -m "Your commit message"
```

#### Verify Signatures
```bash
git log --show-signature
git verify-commit <commit-hash>
```

### GitHub/GitLab Integration

#### Add SSH Key to GitHub
1. Copy your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
2. Go to GitHub Settings → SSH and GPG keys → New SSH key
3. Paste your public key and save

#### Add SSH Key for Commit Verification
1. Go to GitHub Settings → SSH and GPG keys → New SSH key
2. Select "Signing Key" as the key type
3. Paste your public key

#### Configure SSH for Git Operations
```bash
# Clone repositories using SSH
git clone git@github.com:username/repository.git

# Change existing repository to SSH
git remote set-url origin git@github.com:username/repository.git
```

### Token and Certificate Signing

#### Sign Data with OpenSSL

**Using Ed25519:**
```bash
# Sign a file
openssl pkeyutl -sign -inkey ~/.ssh/id_ed25519 -in data.txt -out signature.bin

# Verify signature
openssl pkeyutl -verify -inkey ~/.ssh/id_ed25519 -sigfile signature.bin -in data.txt
```

**Using RSA:**
```bash
# Sign a file
openssl rsautl -sign -inkey ~/.ssh/id_rsa -in data.txt -out signature.bin

# Verify signature
openssl rsautl -verify -inkey ~/.ssh/id_rsa -pubin -in signature.bin
```

#### Sign JWT Tokens

**Create a signed JWT (example with Ed25519):**
```bash
# Install jq and jwt tools if needed
# Example signing workflow:
header='{"alg":"EdDSA","typ":"JWT"}'
payload='{"sub":"1234567890","name":"User","iat":1516239022}'

# Base64 encode
header_b64=$(echo -n "$header" | base64 -w 0 | tr '+/' '-_' | tr -d '=')
payload_b64=$(echo -n "$payload" | base64 -w 0 | tr '+/' '-_' | tr -d '=')

# Create signature
echo -n "${header_b64}.${payload_b64}" | openssl pkeyutl -sign -inkey ~/.ssh/id_ed25519 | base64 -w 0 | tr '+/' '-_' | tr -d '=' > signature.b64

# Complete JWT
jwt="${header_b64}.${payload_b64}.$(cat signature.b64)"
echo $jwt
```

### Certificate Signing Requests (CSR)

```bash
# Generate CSR using your RSA key
openssl req -new -key ~/.ssh/id_rsa -out certificate.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=example.com"

# View CSR
openssl req -text -noout -in certificate.csr
```

## Security Best Practices

### Permissions
Keys are already configured with correct permissions:
- Private keys: `600` (read/write for owner only)
- Public keys: `644` (readable by all, writable by owner)

### Protection
- **NEVER** commit private keys to version control
- **NEVER** share private keys via email or messaging
- **ALWAYS** keep private keys secure and backed up safely
- Add private key paths to `.gitignore`:
  ```
  # .gitignore
  *.pem
  *_rsa
  id_rsa
  id_ed25519
  id_ecdsa
  ```

### Key Management
```bash
# Verify key fingerprints
ssh-keygen -lf ~/.ssh/id_ed25519.pub
ssh-keygen -lf ~/.ssh/id_rsa.pub

# Change private key passphrase (if needed)
ssh-keygen -p -f ~/.ssh/id_ed25519
ssh-keygen -p -f ~/.ssh/id_rsa
```

### SSH Agent (Optional)
Load keys into SSH agent for easier authentication:
```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add keys
ssh-add ~/.ssh/id_ed25519
ssh-add ~/.ssh/id_rsa

# List loaded keys
ssh-add -l
```

## Troubleshooting

### SSH Connection Issues
```bash
# Test SSH connection with verbose output
ssh -v user@hostname

# Verify key permissions
ls -la ~/.ssh/

# Check SSH config
cat ~/.ssh/config
```

### Git Signing Issues
```bash
# Verify Git signing configuration
git config --global --list | grep gpg
git config --global --list | grep signingkey

# Test signing
echo "test" | git hash-object -w --stdin | xargs git tag -s test_tag -m "Test"
```

### Permission Denied
```bash
# Reset permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_ed25519.pub ~/.ssh/id_rsa.pub
```

## Additional Resources

- [GitHub SSH Documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [GitLab SSH Documentation](https://docs.gitlab.com/ee/user/ssh.html)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [SSH.com Key Management](https://www.ssh.com/academy/ssh/key)

## Public Keys

### Ed25519 Public Key
```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAvfnJifvcJIsikkfIChM5abUBWluzKm73eITWLJrDz/U=
-----END PUBLIC KEY-----
```

### RSA Public Key
```
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA7uIkRqQPEWT+Z3zw51x5
NWFzpaoDvHB08E9zE3tGPdFrMzDqAEqn6yCucyyjZeg4lmM27fsmtNAF6u8JbG6r
QTsiOPRzQ95WpV/shIwVUHMaO5IKLkWE7ljcyFylLH5PQQSy4z/hwGa509hZ+1ca
JK2P7nv8fbnOdCLv/9ttwh6qwqwoujKg3TkoL3ziXMD2hVlFhRyzESJnB/iOtxgZ
/GmIqE+/uOhV3j8rsrefWxdl5LKu+/2q+wdg/3P2bY9JeN+SvKJ7MnSNXxp+xtso
Al1H1nPPe+eabTv7bA+UWLlX+SRZO6wQvsQmGJkKAwUj1WqEoocK9Oqz14fXFn7x
o54G/YFIZaFvECIqoxuzDP6tUjtsJkR08BycaZF2nFOhucFKU6igUw6Fcrg7AyhI
5+RdVjOsOHxzXh2iIyFUbkE22cpqP1HMYr36ej6T/t3dls+RkzXyNxMvkbeWxmKS
1uw+DuC3Ka21pR1J2fj6EZB2EOdgtY2P4bG3wrGElvzE8XZeCAzVqoAJ6WdV/sH0
6Skd87FpryMk7qBF52xOE6JCiYpEyrH/Dp0ZQlbZeQqVGMefYdSDrst2RHHPYvgZ
2Gn/VXZEvEu46wjY1HkU5xUJsC+h8mZIuzuka9G/m+V/foZh7uyhaefUZt4pfKWT
HzdsHjRDrau3ivk9pgOfd7sCAwEAAQ==
-----END PUBLIC KEY-----
```

---

**Generated**: November 7, 2025
**Location**: `~/.ssh/`
**Algorithms**: Ed25519, RSA-4096
