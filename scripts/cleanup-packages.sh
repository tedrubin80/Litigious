#!/bin/bash

# Cleanup script to remove node_modules from packages
# This ensures packages only contain source code and package.json

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "============================================"
echo "  Legal Estate Package Cleanup             "
echo "============================================"
echo

# Check if packages directory exists
if [ ! -d "/mnt/legal-estate-packages" ]; then
    print_error "Packages directory not found at /mnt/legal-estate-packages"
    exit 1
fi

# List of packages
packages=(
    "solo"
    "professional"
    "enterprise"
    "white-label"
    "multi-location"
    "on-premise"
    "developer"
)

total_removed=0
total_size_before=0
total_size_after=0

print_info "Analyzing packages before cleanup..."

# Calculate sizes before cleanup
for pkg in "${packages[@]}"; do
    pkg_dir="/mnt/legal-estate-packages/$pkg"
    if [ -d "$pkg_dir" ]; then
        size_before=$(du -sm "$pkg_dir" 2>/dev/null | cut -f1)
        total_size_before=$((total_size_before + size_before))
        echo "  📦 $pkg: ${size_before}MB"
    fi
done

echo
print_info "Starting cleanup of node_modules directories..."

# Remove node_modules from each package
for pkg in "${packages[@]}"; do
    pkg_dir="/mnt/legal-estate-packages/$pkg"

    if [ -d "$pkg_dir" ]; then
        echo "🔍 Processing $pkg package..."

        # Find and remove all node_modules directories
        node_modules_dirs=$(find "$pkg_dir" -name "node_modules" -type d 2>/dev/null | wc -l)

        if [ "$node_modules_dirs" -gt 0 ]; then
            print_warning "Found $node_modules_dirs node_modules directories in $pkg"
            find "$pkg_dir" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
            removed_count=$(find "$pkg_dir" -name "node_modules" -type d 2>/dev/null | wc -l)

            if [ "$removed_count" -eq 0 ]; then
                print_success "Cleaned up all node_modules from $pkg"
                total_removed=$((total_removed + node_modules_dirs))
            else
                print_warning "Some node_modules may still exist in $pkg"
            fi
        else
            print_success "$pkg is already clean (no node_modules found)"
        fi

        # Verify package.json exists
        if [ -f "$pkg_dir/package.json" ]; then
            print_success "$pkg has package.json for dependency management"
        else
            print_error "$pkg missing package.json file!"
        fi

        # Check frontend and backend subdirectories
        if [ -f "$pkg_dir/frontend/package.json" ]; then
            print_success "$pkg frontend has package.json"
        fi

        if [ -f "$pkg_dir/backend/package.json" ]; then
            print_success "$pkg backend has package.json"
        fi

        echo
    else
        print_error "Package directory not found: $pkg_dir"
    fi
done

# Calculate sizes after cleanup
print_info "Analyzing packages after cleanup..."
for pkg in "${packages[@]}"; do
    pkg_dir="/mnt/legal-estate-packages/$pkg"
    if [ -d "$pkg_dir" ]; then
        size_after=$(du -sm "$pkg_dir" 2>/dev/null | cut -f1)
        total_size_after=$((total_size_after + size_after))
        echo "  📦 $pkg: ${size_after}MB"
    fi
done

# Summary
echo
echo "============================================"
echo "  Cleanup Summary                           "
echo "============================================"
echo "📊 Total node_modules removed: $total_removed"
echo "💾 Size before cleanup: ${total_size_before}MB"
echo "💾 Size after cleanup: ${total_size_after}MB"
echo "🚀 Space saved: $((total_size_before - total_size_after))MB"
echo
print_success "Package cleanup completed!"
echo
echo "✅ All packages now contain only:"
echo "   • Source code and configuration files"
echo "   • package.json files for dependency management"
echo "   • Install scripts for automated setup"
echo
echo "📝 Note: Dependencies will be installed automatically"
echo "   when users run the respective install scripts."