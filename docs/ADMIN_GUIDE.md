# Admin panel guide

This guide covers CASSEMIRO's day-to-day administrative tasks.

## Sign in

1. Open `/admin/login` on the website.
2. Enter your email address and individual password.
3. Click `Acessar painel` (Access panel).

If you have not set a password yet, use `Entrar sem senha` (Sign in without a password). Enter an authorized email address, then open the access link sent to your inbox. The link is individual and temporary.

Everyone must use their own account. Do not share passwords. An authenticated account can access the panel only when it also has an authorized administrative profile.

The authorized `owner`, `admin`, and `editor` profiles currently have the same full panel access, by the owner's decision. These labels do not restrict an editor to content-only work. Give an account to a person only when they should be trusted with settings, quotes, publishing, and deletion; remove its administrative profile when access should end.

## Overview

The first screen shows:

- requests with the `Novo` (New) status;
- the total number of requests received;
- the number of registered projects;
- the number of registered testimonials;
- the five most recent requests.

## Quotes

Open `Orçamentos` (Quotes) in the side menu to view contacts submitted through the website.

You can:

- search by name, city, or phone number;
- filter by status;
- open the complete project details;
- call the customer;
- start a WhatsApp conversation;
- update progress.

### Available statuses

- `Novo` (New): not handled yet.
- `Em contato` (In contact): the conversation with the customer has started.
- `Orçamento` (Quote): the quote is being prepared or has been sent.
- `Fechado` (Closed): the job has been confirmed.
- `Arquivado` (Archived): the contact has ended or will not proceed.

Update the status after every important step. This keeps the overview organized.

When you actually speak with a lead by phone, WhatsApp, or email, open their request and click `Registrar contato hoje` (Record contact today). Changing the status or opening WhatsApp does **not** count as confirmed contact. The site anonymizes personal details 12 months after the last recorded contact, so record each real conversation promptly. Anonymous month/category/status statistics remain; contact details and the free-text description cannot be recovered afterward.

If the overview displays “Alertas por e-mail ainda não configurados”, new requests are still saved in this panel, but no email notification is sent. Check `Orçamentos` regularly and ask the site administrator to configure and test the notification sender.

## Projects

Open `Projetos` (Projects) to manage CASSEMIRO's real portfolio.

1. Click `Novo projeto` (New project).
2. Enter only confirmed information about the project.
3. Leave `Projeto publicado` (Published project) unchecked while the entry is incomplete.
4. Select the real project photos in the same form and add a short description for each image. The first selected photo becomes the cover. Photos upload and attach to the project when you click `Guardar projeto e imagens` (Save project and images).
5. If an upload fails, the project remains a draft. Use `Tentar novamente` (Try again) to continue the remaining photos, or open the draft to complete it manually. Do not create a second copy of the project.
6. Review the text, gallery, and cover before publishing. A published project needs at least one image and descriptions for its images.

Additional photos and videos can be managed later in `Galeria do projeto` (Project gallery) on the edit screen.

If the connection fails during an upload, keep the current tab open and use `Tentar novamente` (Try again). The uploader keeps the same file identity and checks whether it was already saved, so retrying does not create another copy or delete a file whose save response was lost. A file whose gallery registration could not be confirmed is kept privately for recovery, not automatically removed. Retry before refreshing or leaving the page: pending file selections and retry identities are held only in this tab. If you have already left, inspect the draft/gallery before selecting photos again; contact support if a private uploaded file remains without a gallery record.

Media can be classified as an image, video, before image, or after image. To create a comparison, use the same name in `Grupo comparativo` (Comparison group) for the before and after images.

The public `Projetos` (Projects) link appears only when at least one project is published. Deleting a project also permanently deletes its files.

## Services

Open `Serviços` (Services) to manage the service areas shown on the website.

- Use the arrows to change the catalog order.
- Click `Visível/Oculto` (Visible/Hidden) to publish or hide a service.
- Open `Editar` (Edit) to change the title, descriptions, and SEO data.
- The price of each service is hidden by default.
- To publish a price, enter the price text and select `Mostrar preço` (Show price).

Avoid fixed prices when the cost depends on scope, materials, or site conditions. Text such as `Sob consulta` (Contact us) or `A partir de…` (Starting at…) can be used when commercially appropriate.

## Testimonials

Open `Depoimentos` (Testimonials) to register reviews received from real customers.

1. Enter the customer's name exactly as authorized.
2. Copy the testimonial without changing its original meaning.
3. Record the source, such as WhatsApp or Google, when known.
4. Use a rating only when the customer actually provided a numerical score.
5. Select `Publicar agora` (Publish now) only after reviewing the author and text.

Pending testimonials remain in the panel but never appear on the website. When no testimonial is approved, the entire public section is hidden automatically.

## Content

Use `Conteúdo` (Content) to change the homepage's main text. Animations and layout remain unchanged. Review long headings on desktop and mobile after publishing.

## Settings

Use `Configurações` (Settings) to update the phone number, WhatsApp number, email address, legal business name, service cities, and default messages.

- Leave the CNPJ, Instagram, and Facebook fields empty until they are confirmed.
- Enter the international phone number using digits only, including `55` and the area code.
- Empty social links do not appear on the website.
- Published changes affect the footer, quick-contact actions, form, and service pages.

## Sign out

Click `Sair` (Sign out) in the upper-right corner. Always end the session on shared computers.

## Security

- Never send your password through WhatsApp or email.
- Access links are individual and temporary; do not forward them to anyone else.
- Never publish the Supabase secret key.
- If you suspect that someone accessed your account, change the password immediately.
- Accounts and permissions must be created individually for Sérgio, Abderrahim, and every other authorized person.
