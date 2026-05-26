import type { EventItem, PostItem } from '../types'

export function renderEventItem(event: EventItem): string {
  const dateFormatted = new Date(event.date).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const linkHtml = event.link
    ? `<a href="${event.link}" class="event-link" target="_blank" rel="noopener noreferrer">Dowiedz się więcej</a>`
    : ''

  return `<div class="event-item" data-status="${event.status}">
  <p class="event-date">${dateFormatted}</p>
  <h3 class="event-title">${event.title}</h3>
  <p class="event-description">${event.description}</p>
  ${linkHtml}
</div>`
}

export function renderEventsSection(events: EventItem[]): string {
  const published = events.filter(e => e.status === 'published')
  if (published.length === 0) return ''

  const itemsHtml = published.map(renderEventItem).join('\n')
  return `<section id="events" class="section bg-base" aria-labelledby="events-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Wydarzenia</span>
      <h2 id="events-heading" class="f-headline">Aktualności</h2>
    </div>
    <div class="events-list">
${itemsHtml}
    </div>
  </div>
</section>`
}

export function renderPostItem(post: PostItem): string {
  const dateFormatted = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return `<article class="post-item" data-status="${post.status}">
  ${dateFormatted ? `<p class="post-date">${dateFormatted}</p>` : ''}
  <h3 class="post-title">${post.title}</h3>
  <div class="post-body">${post.body}</div>
</article>`
}

export function renderPostsSection(posts: PostItem[]): string {
  const published = posts.filter(p => p.status === 'published')
  if (published.length === 0) return ''

  const itemsHtml = published.map(renderPostItem).join('\n')
  return `<section id="posts" class="section bg-surface" aria-labelledby="posts-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Aktualności</span>
      <h2 id="posts-heading" class="f-headline">Blog</h2>
    </div>
    <div class="posts-list">
${itemsHtml}
    </div>
  </div>
</section>`
}
