// Community Page JavaScript
document.addEventListener("DOMContentLoaded", () => {
  const storyForm = document.getElementById("story-form");
  const storyTitle = document.getElementById("story-title");
  const storyContent = document.getElementById("story-content");
  const storyCategory = document.getElementById("story-category");
  const anonymousPost = document.getElementById("anonymous-post");
  const authorName = document.getElementById("author-name");
  const nameGroup = document.getElementById("name-group");
  const clearBtn = document.getElementById("clear-btn");
  const storiesContainer = document.getElementById("stories-container");
  const filterCategory = document.getElementById("filter-category");
  const sortBy = document.getElementById("sort-by");
  const searchStories = document.getElementById("search-stories");
  const successToast = document.getElementById("success-toast");
  const titleCount = document.getElementById("title-count");
  const contentCount = document.getElementById("content-count");
  const storiesCountEl = document.getElementById("stories-count");
  const totalStoriesEl = document.getElementById("total-stories");
  const totalSupportEl = document.getElementById("total-support");

  // Local storage key
  const STORIES_KEY = "community_stories";
  const SUPPORT_KEY = "story_support";
  const COMMENTS_KEY = "story_comments";
  storyTitle.addEventListener("input", () => {
    titleCount.textContent = storyTitle.value.length;
  });

  storyContent.addEventListener("input", () => {
    contentCount.textContent = storyContent.value.length;
  });

  // Anonymous checkbox
  anonymousPost.addEventListener("change", () => {
    nameGroup.style.display = anonymousPost.checked ? "none" : "block";
  });

  // Clear form
  clearBtn.addEventListener("click", () => {
    storyForm.reset();
    titleCount.textContent = "0";
    contentCount.textContent = "0";
    nameGroup.style.display = "none";
  });

  // Submit story
  storyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const story = {
      id: Date.now(),
      title: storyTitle.value.trim(),
      content: storyContent.value.trim(),
      category: storyCategory.value,
      author: anonymousPost.checked ? "Anonymous" : (authorName.value.trim() || "Anonymous"),
      timestamp: new Date().toISOString(),
      supportCount: 0,
      isAnonymous: anonymousPost.checked,
    };

    saveStory(story);

    // Show success 
    showToast("Story shared successfully!");

    // Reset form
    storyForm.reset();
    titleCount.textContent = "0";
    contentCount.textContent = "0";
    nameGroup.style.display = "none";

    // Reload stories
    loadStories();

    // Scroll to stories section
    document.querySelector(".stories-section").scrollIntoView({ behavior: "smooth" });
  });

  // Save story to local storage
  function saveStory(story) {
    const stories = getStories();
    stories.unshift(story); // Add to beginning
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  }

  // Get stories from local storage
  function getStories() {
    const stories = localStorage.getItem(STORIES_KEY);
    return stories ? JSON.parse(stories) : getSampleStories();
  }

  // Get support data
  function getSupportData() {
    const support = localStorage.getItem(SUPPORT_KEY);
    return support ? JSON.parse(support) : {};
  }

  // Save support data
  function saveSupportData(supportData) {
    localStorage.setItem(SUPPORT_KEY, JSON.stringify(supportData));
  }

  // Get comments for all stories
  function getComments() {
    const comments = localStorage.getItem(COMMENTS_KEY);
    return comments ? JSON.parse(comments) : {};
  }

  // Save comments
  function saveComments(commentsData) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(commentsData));
  }

  // Add comment to story
  function addComment(storyId, commentText) {
    const commentsData = getComments();
    
    if (!commentsData[storyId]) {
      commentsData[storyId] = [];
    }

    const comment = {
      id: Date.now(),
      text: commentText.trim(),
      author: "Anonymous", // Can be extended to allow names
      timestamp: new Date().toISOString(),
      likes: 0
    };

    commentsData[storyId].unshift(comment);
    saveComments(commentsData);
    return comment;
  }

  // Get comments for specific story
  function getStoryComments(storyId) {
    const commentsData = getComments();
    return commentsData[storyId] || [];
  }

  // Load and display stories
  function loadStories() {
    let stories = getStories();
    const supportData = getSupportData();

    // Apply filters
    const categoryFilter = filterCategory.value;
    const sortFilter = sortBy.value;
    const searchQuery = searchStories.value.toLowerCase();

    // Filter by category
    if (categoryFilter !== "all") {
      stories = stories.filter((story) => story.category === categoryFilter);
    }

    // Filter by search
    if (searchQuery) {
      stories = stories.filter(
        (story) =>
          story.title.toLowerCase().includes(searchQuery) ||
          story.content.toLowerCase().includes(searchQuery)
      );
    }

    // Sort stories
    if (sortFilter === "recent") {
      stories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortFilter === "popular") {
      stories.sort((a, b) => (supportData[b.id] || b.supportCount || 0) - (supportData[a.id] || a.supportCount || 0));
    } else if (sortFilter === "oldest") {
      stories.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Update counts
    storiesCountEl.textContent = `Showing ${stories.length} ${stories.length === 1 ? "story" : "stories"}`;
    totalStoriesEl.textContent = getStories().length;
    
    // Calculate total support
    const totalSupport = Object.values(supportData).reduce((sum, count) => sum + count, 0);
    totalSupportEl.textContent = totalSupport.toLocaleString();

    // Display stories
    if (stories.length === 0) {
      storiesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No stories found</h3>
          <p>Be the first to share your story or try adjusting your filters.</p>
        </div>
      `;
      return;
    }

    storiesContainer.innerHTML = stories
      .map((story) => createStoryCard(story, supportData))
      .join("");

    // Add event listeners to support buttons
    document.querySelectorAll(".action-btn[data-action='support']").forEach((btn) => {
      btn.addEventListener("click", handleSupport);
    });

    // Add event listeners to comment buttons
    document.querySelectorAll(".action-btn[data-action='comment']").forEach((btn) => {
      btn.addEventListener("click", toggleComments);
    });

    // Add event listeners to comment forms
    document.querySelectorAll(".comment-form").forEach((form) => {
      form.addEventListener("submit", handleCommentSubmit);
    });
  }

  // Create story card HTML
  function createStoryCard(story, supportData) {
    const categoryNames = {
      success: "Success Story",
      "seeking-help": "Seeking Help",
      awareness: "Awareness",
      "legal-victory": "Legal Victory",
      workplace: "Workplace",
      support: "Support",
    };

    const supportCount = supportData[story.id] || story.supportCount || 0;
    const isSupported = localStorage.getItem(`supported_${story.id}`) === "true";
    const timeAgo = getTimeAgo(story.timestamp);
    const comments = getStoryComments(story.id);
    const commentCount = comments.length;

    return `
      <div class="story-card" data-story-id="${story.id}">
        <div class="story-header">
          <span class="story-category ${story.category}">
            ${categoryNames[story.category]}
          </span>
          <span class="story-meta">${timeAgo}</span>
        </div>
        <h3 class="story-title">${escapeHtml(story.title)}</h3>
        <p class="story-content">${escapeHtml(story.content)}</p>
        <div class="story-footer">
          <span class="story-author">— ${escapeHtml(story.author)}</span>
          <div class="story-actions">
            <button class="action-btn ${isSupported ? "supported" : ""}" data-action="support" data-story-id="${story.id}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="${isSupported ? "currentColor" : "none"}">
                <path d="M8 14L2 8C0 6 0 3 2 1C4 -1 7 0 8 2C9 0 12 -1 14 1C16 3 16 6 14 8L8 14Z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span class="support-count">${supportCount} Support</span>
            </button>
            <button class="action-btn" data-action="comment" data-story-id="${story.id}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 10C14 10.5304 13.7893 11.0391 13.4142 11.4142C13.0391 11.7893 12.5304 12 12 12H4L2 14V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H12C12.5304 2 13.0391 2.21071 13.4142 2.58579C13.7893 2.96086 14 3.46957 14 4V10Z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span>${commentCount} ${commentCount === 1 ? "Comment" : "Comments"}</span>
            </button>
          </div>
        </div>
        
        <!-- Comments Section -->
        <div class="comments-section">
          <div class="comments-container" id="comments-${story.id}">
            <form class="comment-form" data-story-id="${story.id}">
              <textarea 
                class="comment-input" 
                placeholder="Share your thoughts or offer support..." 
                rows="2"
                maxlength="500"
                required
              ></textarea>
              <button type="submit" class="comment-submit">Post</button>
            </form>
            <div class="comments-list" id="comments-list-${story.id}">
              ${renderComments(comments)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Render comments HTML
  function renderComments(comments) {
    if (!comments || comments.length === 0) {
      return '<div class="comments-empty">No comments yet. Be the first to share your thoughts!</div>';
    }

    return comments.map(comment => `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.author)}</span>
          <span class="comment-time">${getTimeAgo(comment.timestamp)}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
      </div>
    `).join('');
  }

  // Toggle comments visibility
  function toggleComments(e) {
    const btn = e.currentTarget;
    const storyId = btn.dataset.storyId;
    const commentsContainer = document.getElementById(`comments-${storyId}`);
    
    if (commentsContainer.classList.contains('show')) {
      commentsContainer.classList.remove('show');
    } else {
      commentsContainer.classList.add('show');
      // Focus on comment input
      const input = commentsContainer.querySelector('.comment-input');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  // Handle comment submission
  function handleCommentSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const storyId = parseInt(form.dataset.storyId);
    const input = form.querySelector('.comment-input');
    const commentText = input.value.trim();

    if (!commentText) return;

    // Add comment
    const comment = addComment(storyId, commentText);

    // Update comments list
    const commentsList = document.getElementById(`comments-list-${storyId}`);
    const comments = getStoryComments(storyId);
    commentsList.innerHTML = renderComments(comments);

    // Update comment count in button
    const commentBtn = document.querySelector(`.action-btn[data-action="comment"][data-story-id="${storyId}"]`);
    if (commentBtn) {
      const countSpan = commentBtn.querySelector('span:last-child');
      countSpan.textContent = `${comments.length} ${comments.length === 1 ? "Comment" : "Comments"}`;
    }

    // Clear input
    input.value = '';
    showToast('Comment added!');

    input.style.height = 'auto';
  }

  // Handle support button 
  function handleSupport(e) {
    const btn = e.currentTarget;
    const storyId = parseInt(btn.dataset.storyId);
    const isSupported = localStorage.getItem(`supported_${storyId}`) === "true";

    const supportData = getSupportData();

    if (isSupported) {
      // Remove support
      supportData[storyId] = Math.max(0, (supportData[storyId] || 0) - 1);
      localStorage.removeItem(`supported_${storyId}`);
      btn.classList.remove("supported");
      btn.querySelector("span:first-child").textContent = "🤍";
    } else {
      // Add support
      supportData[storyId] = (supportData[storyId] || 0) + 1;
      localStorage.setItem(`supported_${storyId}`, "true");
      btn.classList.add("supported");
      btn.querySelector("span:first-child").textContent = "❤️";
      
      // Show feedback
      showToast("Support sent! 💜");
    }

    // Update count
    btn.querySelector(".support-count").textContent = `${supportData[storyId]} Support`;
    saveSupportData(supportData);
    
    // Update support count
    const totalSupport = Object.values(supportData).reduce((sum, count) => sum + count, 0);
    totalSupportEl.textContent = totalSupport.toLocaleString();
  }

  // Filter event listeners
  filterCategory.addEventListener("change", loadStories);
  sortBy.addEventListener("change", loadStories);
  searchStories.addEventListener("input", loadStories);

  // Show notification
  function showToast(message) {
    const toastMessage = successToast.querySelector(".toast-message");
    toastMessage.textContent = message;
    successToast.classList.add("show");

    setTimeout(() => {
      successToast.classList.remove("show");
    }, 3000);
  }

  // Utility: Get time 
  function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  // Utility: Escape HTML
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function getSampleStories() {
    const existingComments = getComments();
    if (Object.keys(existingComments).length === 0) {
      const sampleComments = {
        1: [
          {
            id: Date.now() - 1000,
            text: "Thank you for sharing this! Your courage is inspiring. I'm going through something similar and this gives me hope.",
            author: "Anonymous",
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            likes: 0
          },
          {
            id: Date.now() - 2000,
            text: "This is exactly what I needed to hear. Did you have a lawyer or did the ICC handle everything?",
            author: "Anonymous",
            timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
            likes: 0
          }
        ],
        4: [
          {
            id: Date.now() - 3000,
            text: "You're so strong! I'm also in therapy and it's helping. Stay strong sister! 💜",
            author: "Anonymous",
            timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
            likes: 0
          }
        ]
      };
      saveComments(sampleComments);
    }

    return [
      {
        id: 1,
        title: "Standing Up Against Workplace Harassment",
        content: "After months of enduring inappropriate comments and unwanted advances from my supervisor, I finally found the courage to file a complaint under the POSH Act. The Internal Complaints Committee took my case seriously, and justice was served. To anyone going through this: your voice matters, and there are laws to protect you.",
        category: "legal-victory",
        author: "Anonymous",
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        supportCount: 45,
        isAnonymous: true,
      },
      {
        id: 2,
        title: "Free Legal Aid Helped Me Get Justice",
        content: "I want to share my experience with the State Legal Services Authority. As a survivor of domestic violence, I couldn't afford a lawyer. The free legal aid program not only provided me with excellent legal representation but also connected me with counseling services. There is help available - don't suffer in silence.",
        category: "success",
        author: "Priya S.",
        timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
        supportCount: 78,
        isAnonymous: false,
      },
      {
        id: 3,
        title: "Know Your Rights: Street Harassment",
        content: "Many women don't realize that street harassment (eve-teasing) is a punishable offense under IPC Section 354A. You can file a complaint, and the police are obligated to take action. I did this when I was followed and harassed. The perpetrator was caught and faced legal consequences. Document everything and don't hesitate to report.",
        category: "awareness",
        author: "Anonymous",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        supportCount: 92,
        isAnonymous: true,
      },
      {
        id: 4,
        title: "How I Built Confidence After Trauma",
        content: "Recovery is not linear, and that's okay. After my experience with harassment, I struggled with anxiety and trust issues. What helped me: therapy, joining a women's support group, learning self-defense, and most importantly, being patient with myself. To anyone healing: you're stronger than you know. Take it one day at a time.",
        category: "support",
        author: "Anonymous Survivor",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        supportCount: 156,
        isAnonymous: true,
      },
      {
        id: 5,
        title: "Company Retaliated After POSH Complaint - Need Advice",
        content: "I filed a complaint against my manager for sexual harassment, and now the company is trying to transfer me to a remote location. I know this is retaliation, which is illegal under POSH Act Section 13. Has anyone faced this? What steps should I take? I've documented everything but need guidance on next steps.",
        category: "seeking-help",
        author: "Anonymous",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), 
        supportCount: 23,
        isAnonymous: true,
      },
    ];
  }

  loadStories();

  const supportData = getSupportData();
  const totalSupport = Object.values(supportData).reduce((sum, count) => sum + count, 0);
  totalSupportEl.textContent = totalSupport.toLocaleString();
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('comment-input')) {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    }
  });
});
