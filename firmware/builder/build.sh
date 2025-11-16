#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
OS="$(uname -s)"

if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
    PLATFORM="docker"
else
    case "$OS" in
        Linux*)
            PLATFORM="linux"
            print_info "Running on native Linux"
            ;;
        *)
            print_error "Non-Linux platform detected: $OS"
            echo ""
            echo "This build system uses an ARM toolchain compiled for Linux."
            echo "Please use the Docker build script instead:"
            echo ""
            echo "  ${BOLD}./docker-build.sh --api-url <your-url> --force-build${NC}"
            echo ""
            if ! command -v docker >/dev/null 2>&1; then
                echo "Docker is not installed. Download from: https://www.docker.com/products/docker-desktop"
                echo ""
            fi
            exit 1
            ;;
    esac
fi

DEFAULT_API_URL="https://backdoor.nolongerevil.com"
FIRMWARE_DIR="firmware"

BUILD_XLOADER=false
BUILD_UBOOT=false
BUILD_XLOADER_SET=false
BUILD_UBOOT_SET=false
API_URL="${API_URL:-$DEFAULT_API_URL}"
API_URL_SET=false
NON_INTERACTIVE=false
NEED_CUSTOM_BUILD=false
FORCE_BUILD=false
GENERATION="gen2"
GENERATION_SET=true
DEBUG_PAUSE=false
ENABLE_BACKPLATE_SIM=false
ENABLE_ROOT_ACCESS=false
ROOT_PASSWORD=""

if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  NC='\033[0m' 
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  BOLD=''
  NC=''
fi

print_header() {
  echo
  echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║                                                               ║${NC}"
  echo -e "${BOLD}${CYAN}║             ${BOLD}No Longer Evil Firmware Builder${CYAN}                   ║${NC}"
  echo -e "${BOLD}${CYAN}║                                                               ║${NC}"
  echo -e "${BOLD}${CYAN}║                      ${YELLOW}No Longer Evil${CYAN}                           ║${NC}"
  echo -e "${BOLD}${CYAN}║                                                               ║${NC}"
  echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo
}

print_section() {
  echo
  echo -e "${BOLD}${BLUE}┌───────────────────────────────────────────────────────────────┐${NC}"
  echo -e "${BOLD}${BLUE}│${NC} $1"
  echo -e "${BOLD}${BLUE}└───────────────────────────────────────────────────────────────┘${NC}"
  echo
}

print_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
  echo -e "${CYAN}[→]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
  echo -e "${RED}[✗]${NC} $1"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --api-url <url>          Override the default API URL used by the firmware
  --build-xloader          Build x-loader from source instead of using prebuilt
  --build-uboot            Build u-boot from source instead of using prebuilt
  --generation <gen>       Specify Nest generation: gen1 or gen2 (default: gen2)
  --force-build            Force rebuild of kernel even if API URL is default
  --debug-pause            Pause after extracting initramfs for manual editing
  --enable-backplate-sim   Enable backplate simulator in firmware
  --enable-root-access     Enable root access with generated password
  --yes, -y                Run non-interactively with the provided values
  --help, -h               Show this help message
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --api-url)
        shift
        if [ -z "${1:-}" ]; then
          print_error "--api-url requires a value"
          exit 1
        fi
        API_URL="$1"
        API_URL_SET=true
        shift
        ;;
      --build-xloader)
        BUILD_XLOADER=true
        BUILD_XLOADER_SET=true
        shift
        ;;
      --build-uboot)
        BUILD_UBOOT=true
        BUILD_UBOOT_SET=true
        shift
        ;;
      --generation)
        shift
        if [ -z "${1:-}" ]; then
          print_error "--generation requires a value (gen1 or gen2)"
          exit 1
        fi
        if [ "$1" != "gen1" ] && [ "$1" != "gen2" ]; then
          print_error "Invalid generation: $1. Must be 'gen1' or 'gen2'"
          exit 1
        fi
        GENERATION="$1"
        GENERATION_SET=true
        shift
        ;;
      --force-build)
        FORCE_BUILD=true
        shift
        ;;
      --debug-pause)
        DEBUG_PAUSE=true
        shift
        ;;
      --enable-backplate-sim)
        ENABLE_BACKPLATE_SIM=true
        NEED_CUSTOM_BUILD=true
        shift
        ;;
      --enable-root-access)
        ENABLE_ROOT_ACCESS=true
        NEED_CUSTOM_BUILD=true
        shift
        ;;
      --yes|-y|--non-interactive)
        NON_INTERACTIVE=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
}

ask_yes_no() {
  local prompt="$1"
  local default="$2"
  local response

  if [ "$default" = "y" ]; then
    prompt="$prompt [Y/n]: "
  else
    prompt="$prompt [y/N]: "
  fi

  while true; do
    read -p "$prompt" response
    response=${response:-$default}
    case "$response" in
      [Yy]* ) return 0;;
      [Nn]* ) return 1;;
      * ) echo "Please answer yes or no.";;
    esac
  done
}

ask_input() {
  local prompt="$1"
  local default="$2"
  local response

  if [ -n "$default" ]; then
    prompt="$prompt [$default]: "
  else
    prompt="$prompt: "
  fi

  read -p "$prompt" response
  echo "${response:-$default}"
}

check_dependencies() {
  print_section "Checking Dependencies"

  local missing_deps=()

  for cmd in git curl tar gzip cpio sed; do
    if ! command -v $cmd >/dev/null 2>&1; then
      missing_deps+=("$cmd")
    fi
  done

  if [ ${#missing_deps[@]} -gt 0 ]; then
    print_error "Missing required dependencies: ${missing_deps[*]}"
    echo
    echo "Please install the missing dependencies and try again."
    exit 1
  fi

  print_success "All required dependencies found"
}

setup_dependencies() {
  print_section "Setting Up Build Dependencies"

  if [ ! -d "deps/toolchain/arm-2008q3" ] || \
     [ ! -d "deps/x-loader" ] || \
     [ ! -d "deps/u-boot" ] || \
     [ ! -d "deps/linux" ]; then
    print_info "Downloading build dependencies (this may take a while)..."
    echo
    bash scripts/download-deps.sh
  else
    print_success "Build dependencies already present"
  fi

  if [ ! -f "deps/initramfs_data.cpio" ]; then
    print_error "Base initramfs not found at deps/initramfs_data.cpio"
    echo "This file should be included with the builder package."
    exit 1
  fi

  export PATH="$SCRIPT_DIR/deps/toolchain/arm-2008q3/bin:$PATH"
}

configure_build() {
  print_section "Build Configuration"

  if [ "$NON_INTERACTIVE" = false ] && [ "$GENERATION_SET" != true ]; then
    echo -e "${BOLD}Nest Generation:${NC}"
    echo "Please specify which Nest thermostat generation you are building for:"
    echo "  Gen 1: Original Diamond Nest thermostat"
    echo "  Gen 2: j49 Nest thermostat (default)"
    echo

    if ask_yes_no "Are you building for Gen 2 (j49)?" "y"; then
      GENERATION="gen2"
    else
      GENERATION="gen1"
    fi
    echo
  fi

  if [ "$NON_INTERACTIVE" = false ] && [ "$BUILD_XLOADER_SET" != true ]; then
    echo -e "${BOLD}Bootloader Options:${NC}"
    echo "Building from source is only needed if you're modifying bootloader code."
    echo "Pre-compiled binaries are available and recommended for most users."
    echo

    if ask_yes_no "Build x-loader from source?" "n"; then
      BUILD_XLOADER=true
    fi
  fi

  if [ "$NON_INTERACTIVE" = false ] && [ "$BUILD_UBOOT_SET" != true ]; then
    if ask_yes_no "Build u-boot from source?" "n"; then
      BUILD_UBOOT=true
    fi
  fi

  if [ "$API_URL_SET" != true ] && [ "$NON_INTERACTIVE" = false ]; then
    echo
    echo -e "${BOLD}API Configuration:${NC}"
    echo "The Nest will connect to this API server after flashing."
    echo "Default: $DEFAULT_API_URL"
    echo
    API_URL=$(ask_input "Enter API URL" "$API_URL")
  fi

  NEED_CUSTOM_BUILD=false
  if [ "$API_URL" != "$DEFAULT_API_URL" ] || [ "$FORCE_BUILD" = true ]; then
    NEED_CUSTOM_BUILD=true
  fi

  echo
  echo -e "${BOLD}Build Summary:${NC}"
  echo "  Generation:          $GENERATION"
  echo "  x-loader:            $([ "$BUILD_XLOADER" = true ] && echo "Build from source" || echo "Use pre-compiled")"
  echo "  u-boot:              $([ "$BUILD_UBOOT" = true ] && echo "Build from source" || echo "Use pre-compiled")"
  echo "  API URL:             $API_URL"
  echo "  Custom kernel:       $([ "$NEED_CUSTOM_BUILD" = true ] && echo "Yes" || echo "No (using pre-compiled)")"
  echo "  Backplate simulator: $([ "$ENABLE_BACKPLATE_SIM" = true ] && echo "Enabled" || echo "Disabled")"
  echo "  Root access:         $([ "$ENABLE_ROOT_ACCESS" = true ] && echo "Enabled" || echo "Disabled")"
  echo

  if [ "$NON_INTERACTIVE" = false ]; then
    if ! ask_yes_no "Proceed with this configuration?" "y"; then
      print_warning "Build cancelled by user"
      exit 0
    fi
  fi
}

build_firmware() {
  print_section "Building Firmware"

  if [ "$BUILD_XLOADER" = true ]; then
    rm -f "$SCRIPT_DIR/firmware/x-load.bin" 2>/dev/null || true
    rm -f "$SCRIPT_DIR/../installer/resources/firmware/x-load.bin" 2>/dev/null || true
  fi

  if [ "$BUILD_UBOOT" = true ]; then
    rm -f "$SCRIPT_DIR/firmware/u-boot.bin" 2>/dev/null || true
    rm -f "$SCRIPT_DIR/../installer/resources/firmware/u-boot.bin" 2>/dev/null || true
  fi

  if [ "$NEED_CUSTOM_BUILD" = true ]; then
    rm -f "$SCRIPT_DIR/firmware/uImage" 2>/dev/null || true
    rm -f "$SCRIPT_DIR/../installer/resources/firmware/uImage" 2>/dev/null || true
  fi

  if [ "$BUILD_XLOADER" = true ] || [ "$BUILD_UBOOT" = true ]; then
    local bootloader_args=""
    [ "$BUILD_XLOADER" = true ] && bootloader_args="$bootloader_args --xloader"
    [ "$BUILD_UBOOT" = true ] && bootloader_args="$bootloader_args --uboot"
    bootloader_args="$bootloader_args --generation $GENERATION"

    bash scripts/build-bootloaders.sh $bootloader_args
  else
    if [ ! -f "$FIRMWARE_DIR/x-load.bin" ]; then
      print_warning "Pre-compiled x-load.bin not found"
    else
      print_success "Using pre-compiled x-load.bin"
    fi

    if [ ! -f "$FIRMWARE_DIR/u-boot.bin" ]; then
      print_warning "Pre-compiled u-boot.bin not found"
    else
      print_success "Using pre-compiled u-boot.bin"
    fi
  fi

  if [ "$NEED_CUSTOM_BUILD" = true ]; then
    print_info "Building custom kernel with custom initramfs..."
    echo

    print_info "Extracting initramfs from NestDFUAttack base..."
    rm -rf "$SCRIPT_DIR/deps/root"
    mkdir -p "$SCRIPT_DIR/deps/root"
    cd "$SCRIPT_DIR/deps/root"
    cpio -id < "$SCRIPT_DIR/deps/initramfs_data.cpio" 2>/dev/null
    print_success "Extracted initramfs to: deps/root/"

    cd "$SCRIPT_DIR"
    print_info "Configuring NoLongerEvil settings..."

    # 1. Update cloudregisterurl directly in /etc/nestlabs/client.config
    if [ -f "$SCRIPT_DIR/deps/root/etc/nestlabs/client.config" ]; then
      ENTRY_URL="$API_URL"
      if [[ ! "$ENTRY_URL" =~ /entry$ ]]; then
        ENTRY_URL="${ENTRY_URL}/entry"
      fi

      sed -i.bak "s|<a key=\"cloudregisterurl\" value=\"[^\"]*\"|<a key=\"cloudregisterurl\" value=\"$ENTRY_URL\"|g" \
        "$SCRIPT_DIR/deps/root/etc/nestlabs/client.config"
      rm -f "$SCRIPT_DIR/deps/root/etc/nestlabs/client.config.bak"

      if grep -q "cloudregisterurl.*value=\"$ENTRY_URL\"" "$SCRIPT_DIR/deps/root/etc/nestlabs/client.config"; then
        print_success "Updated cloudregisterurl in /etc/nestlabs/client.config to: $ENTRY_URL"
      else
        print_warning "Failed to update cloudregisterurl"
      fi
    else
      print_warning "client.config not found at /etc/nestlabs/client.config"
    fi

    # 2. Overwrite CA certificate directly to /etc/ssl/certs/ca-bundle.pem
    if [ -f "/server/certs/ca-cert.pem" ]; then
      cp "/server/certs/ca-cert.pem" "$SCRIPT_DIR/deps/root/etc/ssl/certs/ca-bundle.pem"
      chmod 644 "$SCRIPT_DIR/deps/root/etc/ssl/certs/ca-bundle.pem"
      print_success "Installed CA certificate to /etc/ssl/certs/ca-bundle.pem"
    else
      print_warning "CA certificate not found at /server/certs/ca-cert.pem"
    fi

    # 3. Modify /etc/init.d/rootme to copy our modified files to /tmp/1/
    ROOTME_SCRIPT="$SCRIPT_DIR/deps/root/etc/init.d/rootme"
    if [ -f "$ROOTME_SCRIPT" ]; then
      print_info "Modifying rootme script to apply NoLongerEvil changes..."

      # Generate encrypted password if root access is enabled
      if [ "$ENABLE_ROOT_ACCESS" = true ]; then
        ROOT_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 18)
        # Generate crypt-compatible password hash (DES format for compatibility)
        ROOT_HASH=$(openssl passwd -crypt "$ROOT_PASSWORD")
        print_success "Generated root password: $ROOT_PASSWORD"
      fi

      # Create new rootme script
      cat > "$ROOTME_SCRIPT" << 'ROOTME_EOF'
#!/bin/sh
set +e
mkdir -p /tmp/1 || true
mount /dev/mtdblock7 /tmp/1 -tjffs2 || true

ROOTME_EOF

      # Add dropbear and busybox setup only if root access is enabled
      if [ "$ENABLE_ROOT_ACCESS" = true ]; then
        cat >> "$ROOTME_SCRIPT" << 'ROOTME_EOF'
cp /bin/busybox2 /tmp/1/bin/busybox2
cp /bin/autossh /tmp/1/bin/autossh
chmod 777 /tmp/1/bin/busybox2
chmod 777 /tmp/1/bin/autossh

#cp /bin/sshconnect /tmp/1/bin/sshconnect
#chmod +x /tmp/1/bin/sshconnect

cp /bin/dropbearmulti /tmp/1/bin/dropbearmulti
ln -s /bin/dropbearmulti /tmp/1/bin/dropbear
ln -s /bin/dropbearmulti /tmp/1/bin/dropbearkey
ln -s /bin/dropbearmulti /tmp/1/bin/ssh
ln -s /bin/dropbearmulti /tmp/1/bin/dropbearconvert

chmod +x /tmp/1/bin/dropbearmulti
chmod +x /tmp/1/bin/dropbear
chmod +x /tmp/1/bin/dropbearkey
chmod +x /tmp/1/bin/ssh
chmod +x /tmp/1/bin/dropbearconvert

mkdir /tmp/1/etc/dropbear
/tmp/1/bin/dropbearkey -t dss -f /tmp/1/etc/dropbear/dropbear_dss_host_key
/tmp/1/bin/dropbearkey -t rsa -s 2048 -f /tmp/1/etc/dropbear/dropbear_rsa_host_key
/tmp/1/bin/dropbearkey -t ecdsa -s 521 -f /tmp/1/etc/dropbear/dropbear_ecdsa_host_key

cat /tmp/1/etc/shadow | grep -v root > /tmp/1/etc/shadow.tmp
mv /tmp/1/etc/shadow.tmp /tmp/1/etc/shadow
echo "root:${ROOT_HASH}:16243:0:99999:7:::" >> /tmp/1/etc/shadow

# Add dropbear to rcS if not already present
if ! grep -q "/bin/dropbear" /tmp/1/etc/init.d/rcS; then
  echo "/bin/dropbear" >> /tmp/1/etc/init.d/rcS
fi

ROOTME_EOF
      fi

      # Add NoLongerEvil file copy commands before umount
      cat >> "$ROOTME_SCRIPT" << 'ROOTME_EOF'
# NoLongerEvil: Copy modified configuration files to persistent storage
cp /etc/nestlabs/client.config /tmp/1/etc/nestlabs/client.config 2>/dev/null || true
cp /etc/ssl/certs/ca-bundle.pem /tmp/1/etc/ssl/certs/ca-bundle.pem 2>/dev/null || true

umount /tmp/1 2>/dev/null || true
reboot
ROOTME_EOF

      chmod 777 "$ROOTME_SCRIPT"
      chmod +x "$ROOTME_SCRIPT"
      print_success "Modified rootme script with NoLongerEvil changes"
    else
      print_warning "rootme script not found at /etc/init.d/rootme"
    fi

    if [ "$DEBUG_PAUSE" = true ]; then
      echo
      echo -e "${BOLD}${YELLOW}════════════════════════════════════════════════════════════${NC}"
      echo -e "${BOLD}${YELLOW}   PAUSED FOR MANUAL MODIFICATIONS${NC}"
      echo -e "${BOLD}${YELLOW}════════════════════════════════════════════════════════════${NC}"
      echo
      echo -e "${CYAN}The initramfs has been extracted to:${NC}"
      echo -e "  ${BOLD}$SCRIPT_DIR/deps/root/${NC}"
      echo
      echo -e "${CYAN}You can now modify files in this directory.${NC}"
      echo
      echo -e "${CYAN}Common modifications:${NC}"
      echo "  • Add/modify files in deps/root/etc/"
      echo "  • Update init scripts in deps/root/etc/init.d/"
      echo "  • Add custom binaries to deps/root/bin/"
      echo "  • Modify SSL certificates in deps/root/etc/ssl/"
      echo
      echo -e "${YELLOW}When you're done with modifications:${NC}"
      echo -e "  ${BOLD}Press ENTER to continue building the kernel${NC}"
      echo
      read -p "Press ENTER to continue..."
      echo
    fi

    cd "$SCRIPT_DIR/deps/root"
    print_info "Packing modified initramfs..."
    mkdir -p "$SCRIPT_DIR/deps/linux"
    find . -print0 | cpio -o -0 -H newc -R 0:0 > "$SCRIPT_DIR/deps/linux/initramfs_data.cpio" 2>/dev/null
    cd "$SCRIPT_DIR"

    SIZE=$(du -h "$SCRIPT_DIR/deps/linux/initramfs_data.cpio" | cut -f1)
    print_success "Repacked initramfs ($SIZE)"

    # Verify repacked CPIO integrity
    if [ -f "$SCRIPT_DIR/deps/initramfs_data.cpio" ]; then
      print_info "Verifying CPIO integrity..."

      ORIG_CPIO="$SCRIPT_DIR/deps/initramfs_data.cpio"
      NEW_CPIO="$SCRIPT_DIR/deps/linux/initramfs_data.cpio"

      # Extract both to temp directories for comparison
      ORIG_TMP=$(mktemp -d)
      NEW_TMP=$(mktemp -d)

      (cd "$ORIG_TMP" && cpio -id < "$ORIG_CPIO" 2>/dev/null)
      (cd "$NEW_TMP" && cpio -id < "$NEW_CPIO" 2>/dev/null)

      # Count files, directories, and symlinks
      ORIG_FILES=$(find "$ORIG_TMP" -type f | wc -l)
      ORIG_DIRS=$(find "$ORIG_TMP" -type d | wc -l)
      ORIG_LINKS=$(find "$ORIG_TMP" -type l | wc -l)

      NEW_FILES=$(find "$NEW_TMP" -type f | wc -l)
      NEW_DIRS=$(find "$NEW_TMP" -type d | wc -l)
      NEW_LINKS=$(find "$NEW_TMP" -type l | wc -l)

      echo "  Original: $ORIG_FILES files, $ORIG_DIRS dirs, $ORIG_LINKS symlinks"
      echo "  Repacked: $NEW_FILES files, $NEW_DIRS dirs, $NEW_LINKS symlinks"

      # Check for differences (case-sensitive filenames are preserved)
      DIFF_OUTPUT=$(diff -rq "$ORIG_TMP" "$NEW_TMP" 2>/dev/null | grep -v "^Only in" || true)
      ADDED_FILES=$(diff -rq "$ORIG_TMP" "$NEW_TMP" 2>/dev/null | grep "^Only in $NEW_TMP" | wc -l)
      REMOVED_FILES=$(diff -rq "$ORIG_TMP" "$NEW_TMP" 2>/dev/null | grep "^Only in $ORIG_TMP" | wc -l)

      if [ -n "$DIFF_OUTPUT" ]; then
        echo -e "${YELLOW}  Modified: $(echo "$DIFF_OUTPUT" | wc -l) files${NC}"
      fi
      if [ "$ADDED_FILES" -gt 0 ]; then
        echo -e "${GREEN}  Added: $ADDED_FILES files${NC}"
      fi
      if [ "$REMOVED_FILES" -gt 0 ]; then
        echo -e "${RED}  Removed: $REMOVED_FILES files${NC}"
      fi

      print_success "CPIO verification complete"

      # Cleanup
      rm -rf "$ORIG_TMP" "$NEW_TMP"
    fi

    print_info "Building kernel with custom initramfs..."

    if [ -d "$SCRIPT_DIR/deps/toolchain/arm-2008q3/bin" ]; then
      export PATH="$SCRIPT_DIR/deps/toolchain/arm-2008q3/bin:$PATH"
      print_info "Toolchain added to PATH for kernel build"
    fi

    bash scripts/build-kernel.sh

    # Clean up extracted files after successful build
    if [ $? -eq 0 ]; then
      rm -rf "$SCRIPT_DIR/deps/root"
      print_info "Cleaned up extracted initramfs"
    fi
  else
    if [ ! -f "$FIRMWARE_DIR/uImage" ]; then
      print_warning "Pre-compiled uImage not found"
    else
      print_success "Using pre-compiled uImage"
    fi
  fi
}

print_results() {
  print_section "Build Complete!"

  echo -e "${BOLD}Firmware files:${NC}"
  echo

  if [ -f "$FIRMWARE_DIR/x-load.bin" ]; then
    SIZE=$(du -h "$FIRMWARE_DIR/x-load.bin" | cut -f1)
    echo "  x-load.bin    $SIZE"
  fi

  if [ -f "$FIRMWARE_DIR/u-boot.bin" ]; then
    SIZE=$(du -h "$FIRMWARE_DIR/u-boot.bin" | cut -f1)
    echo "  u-boot.bin    $SIZE"
  fi

  if [ -f "$FIRMWARE_DIR/uImage" ]; then
    SIZE=$(du -h "$FIRMWARE_DIR/uImage" | cut -f1)
    echo "  uImage        $SIZE"
  fi

  echo
  echo -e "${BOLD}${GREEN}All firmware files are ready in: firmware/${NC}"
  echo

  if [ "$NEED_CUSTOM_BUILD" = true ]; then
    SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)/server"
    echo -e "${BOLD}SSL Certificates:${NC}"
    echo "  Server certificates in: $SERVER_DIR/certs/"
    echo "  - nest_server.crt (server certificate)"
    echo "  - nest_server.key (server private key)"
    echo "  - ca-cert.pem (CA certificate for firmware)"
    echo
  fi

  if [ "$ENABLE_BACKPLATE_SIM" = true ]; then
    echo -e "${BOLD}${YELLOW}Backplate Simulator:${NC}"
    echo "  Backplate simulation is enabled in this firmware"
    echo "  HVAC Type: 1H1C (Heat + Cool)"
    echo "  Wires: Rh, W1, Y1, G"
    echo
  fi

  if [ "$ENABLE_ROOT_ACCESS" = true ] && [ -n "$ROOT_PASSWORD" ]; then
    echo -e "${BOLD}${RED}Root Access Enabled:${NC}"
    echo -e "  ${BOLD}Username:${NC} root"
    echo -e "  ${BOLD}Password:${NC} ${BOLD}${RED}$ROOT_PASSWORD${NC}"
    echo
    echo -e "${YELLOW}  ⚠️  IMPORTANT: Save this password securely!${NC}"
    echo -e "${YELLOW}  ⚠️  Root access is enabled on this firmware${NC}"
    echo
  fi
}

main() {
  parse_args "$@"
  print_header
  check_dependencies
  setup_dependencies
  configure_build
  build_firmware
  print_results
}

main "$@"
