insert into public.services (
  slug,
  title,
  short_description,
  content,
  is_visible,
  sort_order,
  show_price,
  seo_title,
  seo_description
)
values
  (
    'construcao-residencial',
    'Construção Residencial',
    'Casas construídas com planejamento, precisão e cuidado em cada etapa.',
    'Construção de casas completas, ampliações e piscinas, da fundação à entrega.',
    true,
    10,
    false,
    'Construção residencial em Sorocaba',
    'Construção de casas em Sorocaba e região, do alicerce ao acabamento.'
  ),
  (
    'reformas',
    'Reformas',
    'Transformações completas ou pontuais com respeito ao espaço e à rotina.',
    'Reformas completas, cozinhas, banheiros, ampliações e pequenos reparos.',
    true,
    20,
    false,
    'Reformas em Sorocaba',
    'Reformas residenciais e comerciais em Sorocaba e região.'
  ),
  (
    'construcao-comercial',
    'Construção Comercial',
    'Execução responsável para espaços comerciais funcionais e duráveis.',
    'Construção e adequação de lojas, escritórios e outros espaços comerciais.',
    true,
    30,
    false,
    'Construção comercial em Sorocaba',
    'Construção e adequação de espaços comerciais em Sorocaba e região.'
  ),
  (
    'alvenaria-e-estruturas',
    'Alvenaria e Estruturas',
    'A base da obra executada com experiência prática e atenção técnica.',
    'Fundações, concreto, alvenaria, demolições e telhados.',
    true,
    40,
    false,
    'Alvenaria e estruturas em Sorocaba',
    'Serviços de fundação, concreto, alvenaria e estruturas em Sorocaba.'
  ),
  (
    'instalacoes',
    'Instalações',
    'Soluções integradas à obra para segurança e eficiência.',
    'Instalações elétricas, hidráulicas e sistemas em drywall.',
    true,
    50,
    false,
    'Instalações para obras em Sorocaba',
    'Instalações elétricas, hidráulicas e drywall para obras em Sorocaba.'
  ),
  (
    'acabamentos',
    'Acabamentos',
    'Precisão nos detalhes que definem o resultado final.',
    'Pisos, revestimentos, pintura e acabamentos para ambientes internos e externos.',
    true,
    60,
    false,
    'Acabamentos para obras em Sorocaba',
    'Pisos, revestimentos, pintura e acabamentos em Sorocaba e região.'
  )
on conflict (slug) do update
set
  title = excluded.title,
  short_description = excluded.short_description,
  content = excluded.content,
  is_visible = excluded.is_visible,
  sort_order = excluded.sort_order,
  show_price = excluded.show_price,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.site_settings (key, value, is_public)
values
  ('brand_name', to_jsonb('CASSEMIRO'::text), true),
  ('descriptor', to_jsonb('Construção & Reformas'::text), true),
  ('slogan', to_jsonb('Do alicerce ao acabamento.'::text), true),
  ('legal_name', to_jsonb('Cassemiro Construções LTDA'::text), true),
  ('phone', jsonb_build_object('display', '(15) 99610-1849', 'e164', '5515996101849'), true),
  ('email', to_jsonb('Cassemiro.obras@gmail.com'::text), true),
  ('service_areas', jsonb_build_array('Sorocaba', 'Votorantim', 'Itu', 'Porto Feliz'), true),
  ('service_radius_km', to_jsonb(50), true),
  ('quote_message', to_jsonb('Olá, encontrei a CASSEMIRO pelo site e gostaria de solicitar um orçamento.'::text), true),
  ('recruitment_message', to_jsonb('Olá, encontrei a CASSEMIRO pelo site e gostaria de saber sobre oportunidades para trabalhar com a equipe.'::text), true)
on conflict (key) do update
set value = excluded.value, is_public = excluded.is_public;
