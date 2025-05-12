# Build Number Generation

This project supports two methods for generating build numbers for versioning. Choose the method that best fits your workflow.

## Method 1: Incrementing Counter File (Default)

This method stores a counter in a file that is incremented with each build.

**How it works:**
1. A file (`build/build-number.txt`) stores the current build number
2. During the build process, the workflow:
   - Reads the current number
   - Increments it for the next build
   - Uses the current number for the current build
   - Commits the updated number back to the repository

**Pros:**
- Simple, predictable sequential numbering
- Works even if repository is cloned fresh
- Visible history of build numbers

**Cons:**
- Requires commit access during CI/CD process
- Potential for conflicts if multiple workflows run simultaneously

## Method 2: Git Commit Count

This method uses the number of commits in the repository plus an offset as the build number.

**How it works:**
1. The script (`build/generate-build-number.sh`) counts commits:
   ```bash
   # Count all commits in the current branch
   COMMIT_COUNT=$(git rev-list --count HEAD)
   
   # Add an offset if you want to start from a higher number
   OFFSET=10000
   BUILD_NUMBER=$((COMMIT_COUNT + OFFSET))
   ```

2. To use this method, modify the workflow file to use this script instead:
   ```yaml
   - name: Get build number from git commits
     id: get_build_number
     run: |
       echo "build_number=$(./build/generate-build-number.sh)" >> $GITHUB_OUTPUT
   ```

**Pros:**
- No additional commits needed
- No risk of conflicts
- Always increases as repository grows
- Tied directly to git history

**Cons:**
- Not as predictable or sequential
- Depends on repository history
- Different between branches

## Switching Methods

To switch between methods:

1. **For counter file method (default)**:
   - Ensure `build/build-number.txt` exists
   - Use the steps in the workflow as configured

2. **For git commit count method**:
   - Comment out or remove the counter file logic in the workflow file
   - Replace with the git commit count logic:
   ```yaml
   - name: Get build number
     id: get_version
     run: |
       # Use git commit count as build number
       BUILD_NUMBER=$(./build/generate-build-number.sh)
       echo "build_number=$BUILD_NUMBER" >> $GITHUB_OUTPUT
       
       # Get version tag as before
       if [[ ${{ github.ref_type }} == 'tag' && ${{ github.ref_name }} == v* ]]; then
         VERSION=$(echo ${{ github.ref_name }} | sed 's/^v//')
         echo "version=$VERSION" >> $GITHUB_OUTPUT
       else
         SHORT_SHA=$(echo ${{ github.sha }} | cut -c1-8)
         echo "version=$SHORT_SHA" >> $GITHUB_OUTPUT
       fi
   ```

## Testing Locally

To test build number generation locally:

### Counter File Method
```bash
cat build/build-number.txt
```

### Git Commit Count Method
```bash
./build/generate-build-number.sh
```