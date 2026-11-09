import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen, Plus, Search, Heart, Sun, Moon, Clock3, ChefHat,
  ArrowLeft, Pencil, Trash2, X, ImagePlus, Minus, Share2,
  Utensils, SlidersHorizontal, Check, Camera, LogOut, Mail,
  LockKeyhole, UserRound, Eye, EyeOff, Users, Send, Inbox,
  RefreshCw, AlertCircle
} from 'lucide-react'
import { supabase } from './supabase'
import './App.css'

const THEME_KEY = 'moje-recepty-theme-v2'
const BUCKET = 'recipe-photos'
const CATEGORIES = ['Všechny', 'Oblíbené', 'Snídaně', 'Obědy', 'Večeře', 'Dezerty', 'Polévky', 'Pečení', 'Ostatní']
const EMPTY_FORM = {
  title: '', description: '', difficulty: 'Snadná', category: 'Ostatní',
  prep_time: '', servings: 2, image: null,
  ingredients: [{ name: '', amount: '', unit: '' }],
  steps: ['']
}

function notifyError(error) {
  console.error(error)
  return error?.message || 'Něco se nepodařilo. Zkus to prosím znovu.'
}

async function compressImage(file) {
  if (!file || !file.type.startsWith('image/')) return null
  const bitmap = await createImageBitmap(file)
  const max = 1400
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))
}

function amountFor(item, originalServings, currentServings) {
  const number = Number(String(item.amount ?? '').replace(',', '.'))
  if (!item.amount || !Number.isFinite(number)) return item.amount || ''
  const result = number * currentServings / Math.max(1, Number(originalServings) || 1)
  return Number.isInteger(result) ? String(result) : String(Math.round(result * 100) / 100).replace('.', ',')
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin }
        })
        if (authError) throw authError
        if (!data.session) {
          setMessage('Účet byl vytvořen. Zkontroluj e-mail a potvrď registraci, potom se přihlas.')
        } else {
          setMessage('Registrace proběhla. Jsi přihlášená.')
        }
      } else if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        })
        if (authError) throw authError
        setMessage('Pokud je e-mail registrovaný, přijde ti odkaz pro změnu hesla.')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        if (authError) throw authError
      }
    } catch (err) {
      setError(notifyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark"><BookOpen size={23} /></span>
          <div><strong>Moje recepty</strong><small>Osobní digitální kuchařka</small></div>
        </div>
        <div className="auth-intro">
          <p className="eyebrow">VAŠE KUCHAŘKA</p>
          <h1>{mode === 'signup' ? 'Vytvořit účet' : mode === 'reset' ? 'Obnovení hesla' : 'Vítej zpět'}</h1>
          <p>{mode === 'signup' ? 'Založ si účet a začni si ukládat své recepty.' : mode === 'reset' ? 'Pošleme ti odkaz pro nastavení nového hesla.' : 'Přihlas se a pokračuj ve své kuchařce.'}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span>E-mail</span>
            <div className="input-with-icon"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="vas@email.cz" /></div>
          </label>
          {mode !== 'reset' && <label className="field">
            <span>Heslo</span>
            <div className="input-with-icon"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Alespoň 6 znaků" /><button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label="Zobrazit heslo">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </label>}
          {mode === 'login' && <button type="button" className="text-button forgot-link" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Zapomenuté heslo?</button>}
          {error && <div className="notice error-notice"><AlertCircle size={17} />{error}</div>}
          {message && <div className="notice success-notice"><Check size={17} />{message}</div>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Pracuji…' : mode === 'signup' ? 'Vytvořit účet' : mode === 'reset' ? 'Odeslat odkaz' : 'Přihlásit se'}</button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? <>Ještě nemáš účet? <button onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Zaregistrovat se</button></> :
            mode === 'signup' ? <>Už účet máš? <button onClick={() => { setMode('login'); setError(''); setMessage('') }}>Přihlásit se</button></> :
              <>Zpět na <button onClick={() => { setMode('login'); setError(''); setMessage('') }}>přihlášení</button></>}
        </div>
      </section>
      <p className="auth-footnote">Soukromá kuchařka pro tvoje recepty.</p>
    </main>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [recipes, setRecipes] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [allShares, setAllShares] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Všechny')
  const [selected, setSelected] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [servings, setServings] = useState(2)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState('viewer')
  const [loadingData, setLoadingData] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setNotice(notifyError(error))
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return
    setLoadingData(true)
    try {
      const { data: rows, error: recipesError } = await supabase
        .from('recipes').select('*').order('updated_at', { ascending: false })
      if (recipesError) throw recipesError
      const ids = (rows || []).map(r => r.id)
      let ingredients = []
      let steps = []
      if (ids.length) {
        const [ingredientResult, stepResult] = await Promise.all([
          supabase.from('recipe_ingredients').select('*').in('recipe_id', ids).order('position'),
          supabase.from('recipe_steps').select('*').in('recipe_id', ids).order('position')
        ])
        if (ingredientResult.error) throw ingredientResult.error
        if (stepResult.error) throw stepResult.error
        ingredients = ingredientResult.data || []
        steps = stepResult.data || []
      }
      const combined = await Promise.all((rows || []).map(async recipe => {
        const imagePath = recipe.image_url || null
        let image = ''
        if (imagePath) {
          const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(imagePath, 3600)
          if (!signedError) image = signed?.signedUrl || ''
        }
        return {
          ...recipe,
          imagePath,
          image,
          ingredients: ingredients.filter(item => item.recipe_id === recipe.id),
          steps: steps.filter(item => item.recipe_id === recipe.id)
        }
      }))
      setRecipes(combined)
      const { data: shares, error: sharesError } = await supabase.rpc('get_my_recipe_shares')
      if (sharesError) throw sharesError
      setAllShares(shares || [])
      setIncoming((shares || []).filter(s => s.direction === 'incoming' && s.status === 'pending'))
      setOutgoing((shares || []).filter(s => s.direction === 'outgoing'))
    } catch (error) {
      setNotice(notifyError(error))
    } finally {
      setLoadingData(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) loadData()
    else {
      setRecipes([])
      setIncoming([])
      setOutgoing([])
    }
  }, [session?.user?.id, loadData])

  const visibleRecipes = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('cs')
    return recipes.filter(recipe => {
      const matches = !term || [
        recipe.title, recipe.description, recipe.category,
        ...(recipe.ingredients || []).map(item => item.name)
      ].join(' ').toLocaleLowerCase('cs').includes(term)
      const matchesFilter = filter === 'Všechny'
        || (filter === 'Oblíbené' ? recipe.favorite : recipe.category === filter)
      return matches && matchesFilter
    })
  }, [recipes, query, filter])

  function openNew() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, ingredients: [{ name: '', amount: '', unit: '' }], steps: [''] })
    setEditorOpen(true)
  }

  function openEdit(recipe) {
    setEditingId(recipe.id)
    setForm({
      title: recipe.title || '', description: recipe.description || '',
      difficulty: recipe.difficulty || 'Snadná', category: recipe.category || 'Ostatní',
      prep_time: recipe.prep_time || '', servings: recipe.servings || 2,
      image: null,
      ingredients: recipe.ingredients?.length ? recipe.ingredients.map(i => ({ name: i.name, amount: i.amount || '', unit: i.unit || '' })) : [{ name: '', amount: '', unit: '' }],
      steps: recipe.steps?.length ? recipe.steps.map(s => s.instruction) : ['']
    })
    setEditorOpen(true)
  }

  function changeIngredient(index, field, value) {
    setForm(current => ({ ...current, ingredients: current.ingredients.map((item, i) => i === index ? { ...item, [field]: value } : item) }))
  }
  function changeStep(index, value) {
    setForm(current => ({ ...current, steps: current.steps.map((step, i) => i === index ? value : step) }))
  }

  async function uploadPhoto(file, recipe) {
    if (!file) return recipe.image_url || null
    const blob = await compressImage(file)
    if (!blob) throw new Error('Vybraný soubor není obrázek.')
    const path = `${recipe.owner_id}/${recipe.id}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false
    })
    if (error) throw error
    if (recipe.image_url) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([recipe.image_url])
      if (removeError) console.warn('Starou fotografii se nepodařilo odebrat:', removeError.message)
    }
    return path
  }

  async function saveRecipe(event) {
    event.preventDefault()
    if (!form.title.trim()) return setNotice('Doplň název receptu.')
    const ingredientRows = form.ingredients.filter(i => i.name.trim())
    const stepRows = form.steps.map(s => s.trim()).filter(Boolean)
    if (!ingredientRows.length) return setNotice('Přidej alespoň jednu surovinu.')
    if (!stepRows.length) return setNotice('Přidej alespoň jeden krok postupu.')
    setBusy(true)
    try {
      // Ověříme aktuálního uživatele přímo u Supabase Auth.
      // To nám umožní porovnat session v aplikaci s identitou použitou pro RLS.
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const authUser = authData?.user
      if (!authUser?.id) throw new Error('Přihlášení vypršelo. Odhlas se a znovu se přihlas.')

      const userId = authUser.id
      console.log('[Recepty] AUTH USER:', authUser.id)
      console.log('[Recepty] SESSION USER:', session?.user?.id)
      console.log('[Recepty] USER IDS MATCH:', authUser.id === session?.user?.id)

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        category: form.category,
        prep_time: form.prep_time.trim(),
        servings: Math.max(1, Number(form.servings) || 1),
        updated_at: new Date().toISOString()
      }
      let recipe
      if (editingId) {
        const existing = recipes.find(r => r.id === editingId)
        if (!existing) throw new Error('Recept nebyl nalezen.')

        // UPDATE bez RETURNING: samotné uložení nepotřebuje načítat řádek zpět.
        const { error } = await supabase
          .from('recipes')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
        recipe = { ...existing, ...payload }

        const [deleteIngredients, deleteSteps] = await Promise.all([
          supabase.from('recipe_ingredients').delete().eq('recipe_id', editingId),
          supabase.from('recipe_steps').delete().eq('recipe_id', editingId)
        ])
        if (deleteIngredients.error) throw deleteIngredients.error
        if (deleteSteps.error) throw deleteSteps.error
      } else {
        // ID vytvoříme na klientovi. INSERT bez .select() zabrání tomu,
        // aby INSERT ... RETURNING narazil na samostatnou SELECT RLS policy.
        const recipeId = crypto.randomUUID()
        const newRecipe = {
          id: recipeId,
          ...payload,
          owner_id: userId,
          favorite: false
        }
        const { error } = await supabase.from('recipes').insert(newRecipe)
        if (error) throw error
        recipe = newRecipe
      }

      const ingredientInsert = ingredientRows.map((item, index) => ({
        recipe_id: recipe.id, name: item.name.trim(), amount: item.amount.trim(),
        unit: item.unit.trim(), position: index
      }))
      const stepInsert = stepRows.map((instruction, index) => ({
        recipe_id: recipe.id, instruction, position: index
      }))
      const [ingredientResult, stepResult] = await Promise.all([
        supabase.from('recipe_ingredients').insert(ingredientInsert),
        supabase.from('recipe_steps').insert(stepInsert)
      ])
      if (ingredientResult.error) throw ingredientResult.error
      if (stepResult.error) throw stepResult.error

      const old = recipes.find(r => r.id === recipe.id)
      let imagePath = old?.imagePath || recipe.image_url || null
      if (form.image) {
        imagePath = await uploadPhoto(form.image, { ...recipe, image_url: imagePath })
        const { error } = await supabase.from('recipes').update({ image_url: imagePath }).eq('id', recipe.id)
        if (error) throw error
      }
      setEditorOpen(false)
      setSelected(null)
      await loadData()
      setNotice(editingId ? 'Recept byl upraven.' : 'Recept byl uložen.')
    } catch (error) {
      setNotice(notifyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function toggleFavorite(recipe) {
    if (recipe.owner_id !== session.user.id) {
      setNotice('Oblíbené označení může zatím měnit pouze majitelka receptu.')
      return
    }
    const { error } = await supabase.from('recipes').update({ favorite: !recipe.favorite }).eq('id', recipe.id)
    if (error) setNotice(notifyError(error))
    else await loadData()
  }

  async function deleteRecipe(recipe) {
    if (recipe.owner_id !== session.user.id) return setNotice('Smazat recept může pouze jeho majitelka.')
    if (!window.confirm(`Opravdu chceš smazat recept „${recipe.title}“?`)) return
    setBusy(true)
    try {
      if (recipe.imagePath) {
        const { error: storageError } = await supabase.storage.from(BUCKET).remove([recipe.imagePath])
        if (storageError) console.warn(storageError.message)
      }
      const { error } = await supabase.from('recipes').delete().eq('id', recipe.id)
      if (error) throw error
      setSelected(null)
      await loadData()
      setNotice('Recept byl smazán.')
    } catch (error) {
      setNotice(notifyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function inviteByEmail(event) {
    event.preventDefault()
    if (!selected || !shareEmail.trim()) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('share_recipe_with_email', {
        target_recipe_id: selected.id,
        target_email: shareEmail.trim(),
        access_role: shareRole
      })
      if (error) throw error
      setShareEmail('')
      setNotice('Pozvánka byla vytvořena. Druhá uživatelka ji uvidí po přihlášení.')
      await loadData()
    } catch (error) {
      setNotice(notifyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function acceptInvite(shareId) {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('accept_recipe_share', { target_share_id: shareId })
      if (error) throw error
      if (!data) throw new Error('Pozvánku se nepodařilo přijmout.')
      await loadData()
      setNotice('Pozvánka přijata. Recept najdeš ve své sbírce.')
    } catch (error) {
      setNotice(notifyError(error))
    } finally {
      setBusy(false)
    }
  }

  async function removeShare(shareId) {
    if (!window.confirm('Opravdu chceš zrušit toto sdílení?')) return
    const { error } = await supabase.from('recipe_shares').delete().eq('id', shareId)
    if (error) setNotice(notifyError(error))
    else {
      await loadData()
      setNotice('Sdílení bylo zrušeno.')
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) setNotice(notifyError(error))
    setSelected(null)
  }

  async function shareText(recipe) {
    const text = `${recipe.title}\n\n${recipe.description || ''}\n\nSuroviny:\n${recipe.ingredients.map(i => `• ${i.amount} ${i.unit} ${i.name}`.trim()).join('\n')}\n\nPostup:\n${recipe.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n')}`
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, text })
      else {
        await navigator.clipboard.writeText(text)
        setNotice('Text receptu byl zkopírován.')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setNotice('Sdílení se nepodařilo.')
    }
  }

  if (authLoading) return <div className="loading-screen"><div className="loading-mark"><BookOpen size={25} /></div><span>Načítám kuchařku…</span></div>
  if (!session) return <AuthScreen />

  const selectedRecipe = selected ? recipes.find(r => r.id === selected.id) || selected : null
  const isOwner = selectedRecipe?.owner_id === session.user.id
  const canEdit = isOwner || allShares.some(s => s.recipe_id === selectedRecipe?.id && s.direction === 'incoming' && s.role === 'editor' && s.status === 'accepted')

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setSelected(null)} aria-label="Domů">
          <span className="brand-mark"><BookOpen size={22} /></span>
          <span><strong>Moje recepty</strong><small>Osobní digitální kuchařka</small></span>
        </button>
        <div className="top-actions">
          <span className="user-email"><UserRound size={15} />{session.user.email}</span>
          <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Přepnout vzhled" aria-label="Přepnout vzhled">{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button className="icon-button" onClick={signOut} title="Odhlásit se" aria-label="Odhlásit se"><LogOut size={18} /></button>
          <button className="primary-button top-add" onClick={openNew}><Plus size={18} /> Přidat recept</button>
        </div>
      </header>

      {!selectedRecipe ? (
        <main className="home-page">
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-line" /> MOJE KUCHAŘKA</p>
              <h1>Všechny recepty<br /><em>na jednom místě.</em></h1>
              <p className="hero-text">Ukládej si recepty, přidávej fotografie a měj své oblíbené postupy přehledně po ruce.</p>
              <button className="primary-button hero-button" onClick={openNew}><Plus size={18} /> Přidat recept</button>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="hero-circle circle-one" /><div className="hero-circle circle-two" /><div className="hero-note"><ChefHat size={27} /><span>Moje<br />recepty</span></div><div className="hero-stamp">MOJE<br />RECEPTY</div><div className="hero-leaf leaf-one">✳</div><div className="hero-leaf leaf-two">✦</div></div>
          </section>

          {incoming.length > 0 && <section className="invites-panel">
            <div className="invites-title"><Inbox size={19} /><div><strong>Pozvánky ke sdílení</strong><small>Můžeš přijmout přístup ke sdíleným receptům.</small></div></div>
            {incoming.map(invite => <div className="invite-row" key={invite.id}>
              <div><strong>{invite.recipe_title}</strong><small>{invite.role === 'editor' ? 'Můžeš recept upravovat' : 'Přístup pouze pro čtení'}</small></div>
              <button className="primary-button compact-button" disabled={busy} onClick={() => acceptInvite(invite.id)}><Check size={15} /> Přijmout</button>
            </div>)}
          </section>}

          <section className="library-section">
            <div className="library-heading"><div><p className="eyebrow">VAŠE SBÍRKA</p><h2>Vaše recepty</h2></div><div className="heading-actions"><span className="collection-count">{recipes.length} uložených</span><button className="icon-button" onClick={loadData} title="Obnovit" aria-label="Obnovit"><RefreshCw size={16} /></button></div></div>
            <div className="toolbar">
              <label className="search-box"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Hledat recept nebo surovinu..." /></label>
              <div className="filter-wrap"><SlidersHorizontal size={17} /><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filtrovat recepty">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            {loadingData ? <div className="empty-state"><RefreshCw className="spin" size={25} /><p>Načítám recepty…</p></div> : visibleRecipes.length ? <div className="recipe-grid">
              {visibleRecipes.map(recipe => <article className="recipe-card" key={recipe.id}>
                <button className="card-image-button" onClick={() => { setSelected(recipe); setServings(recipe.servings || 2) }} aria-label={`Otevřít ${recipe.title}`}>
                  {recipe.image ? <img src={recipe.image} alt={recipe.title} className="card-image" /> : <div className="image-placeholder"><Utensils size={30} /><span>Bez fotografie</span></div>}
                  <span className="category-pill">{recipe.category}</span>
                </button>
                <div className="card-content">
                  <div className="card-title-row"><button className="card-title" onClick={() => { setSelected(recipe); setServings(recipe.servings || 2) }}>{recipe.title}</button>{recipe.owner_id === session.user.id && <button className={`icon-button card-heart ${recipe.favorite ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(recipe)} aria-label="Oblíbený recept"><Heart size={18} fill={recipe.favorite ? 'currentColor' : 'none'} /></button>}</div>
                  <p className="card-description">{recipe.description || 'Bez popisu.'}</p>
                  <div className="card-meta"><span><ChefHat size={15} /> {recipe.difficulty}</span>{recipe.prep_time && <span><Clock3 size={15} /> {recipe.prep_time}</span>}{recipe.owner_id !== session.user.id && <span><Users size={14} /> Sdílený</span>}</div>
                </div>
              </article>)}
            </div> : <div className="empty-state"><div className="empty-icon"><BookOpen size={30} /></div><h3>{recipes.length ? 'Nic jsme nenašli' : 'Zatím tu nemáš žádné recepty'}</h3><p>{recipes.length ? 'Zkus změnit hledaný výraz nebo filtr.' : 'Přidej svůj první recept a budeš ho mít uložený ve své kuchařce.'}</p>{!recipes.length && <button className="primary-button" onClick={openNew}><Plus size={18} /> Přidat recept</button>}</div>}
          </section>
        </main>
      ) : (
        <main className="detail-page">
          <button className="back-button" onClick={() => setSelected(null)}><ArrowLeft size={17} /> Zpět na recepty</button>
          <div className="detail-layout">
            <section className="detail-main">
              <div className="detail-image-wrap">{selectedRecipe.image ? <img src={selectedRecipe.image} alt={selectedRecipe.title} className="detail-image" /> : <div className="image-placeholder detail-placeholder"><Utensils size={42} /><span>Fotografie receptu</span></div>}<span className="image-label">{selectedRecipe.category}</span></div>
              <div className="detail-heading"><div><p className="eyebrow">MOJE KUCHAŘKA</p><h1>{selectedRecipe.title}</h1>{selectedRecipe.description && <p className="detail-description">{selectedRecipe.description}</p>}</div>{isOwner && <button className={`icon-button favorite-large ${selectedRecipe.favorite ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(selectedRecipe)} aria-label="Oblíbený recept"><Heart size={22} fill={selectedRecipe.favorite ? 'currentColor' : 'none'} /></button>}</div>
              <div className="meta-row"><span><ChefHat size={17} /> {selectedRecipe.difficulty}</span>{selectedRecipe.prep_time && <span><Clock3 size={17} /> {selectedRecipe.prep_time}</span>}<span><Utensils size={17} /> {selectedRecipe.servings} porcí</span></div>
              <section className="recipe-section">
                <div className="section-heading"><h2>Suroviny</h2><span className="muted">Přepočítat porce</span></div>
                <div className="servings-control"><button className="icon-button small" onClick={() => setServings(v => Math.max(1, v - 1))}><Minus size={15} /></button><strong>{servings} porcí</strong><button className="icon-button small" onClick={() => setServings(v => v + 1)}><Plus size={15} /></button><button className="text-button" onClick={() => setServings(selectedRecipe.servings || 2)}>Původní počet</button></div>
                <ul className="ingredient-list">{selectedRecipe.ingredients.map(item => <li key={item.id}><span>{item.name}</span><strong>{amountFor(item, selectedRecipe.servings, servings)} {item.unit}</strong></li>)}</ul>
              </section>
              <section className="recipe-section"><h2>Postup přípravy</h2><ol className="steps-list">{selectedRecipe.steps.map((step, index) => <li key={step.id}><span className="step-number">{index + 1}</span><p>{step.instruction}</p></li>)}</ol></section>
            </section>
            <aside className="detail-aside">
              <div className="aside-card"><p className="eyebrow">MOŽNOSTI RECEPTU</p>{canEdit && <button className="aside-action" onClick={() => openEdit(selectedRecipe)}><Pencil size={17} /> Upravit recept</button>}{isOwner && <button className="aside-action" onClick={() => setShareOpen(true)}><Share2 size={17} /> Sdílet recept</button>}<button className="aside-action" onClick={() => shareText(selectedRecipe)}><Mail size={17} /> Sdílet text receptu</button>{isOwner && <button className="aside-action danger-action" disabled={busy} onClick={() => deleteRecipe(selectedRecipe)}><Trash2 size={17} /> Smazat recept</button>}</div>
              {isOwner && <div className="aside-card share-list-card"><p className="eyebrow">SDÍLENÍ TOHOTO RECEPTU</p>{outgoing.filter(s => s.recipe_id === selectedRecipe.id).length ? outgoing.filter(s => s.recipe_id === selectedRecipe.id).map(s => <div className="share-status" key={s.id}><span>{s.user_email || 'Pozvaná uživatelka'}</span><small>{s.status === 'accepted' ? 'Přijato' : 'Čeká na přijetí'} · {s.role === 'editor' ? 'Úpravy' : 'Čtení'}</small><button className="text-button danger-text" onClick={() => removeShare(s.id)}>Zrušit</button></div>) : <p className="muted">Zatím není sdílený.</p>}</div>}
            </aside>
          </div>
        </main>
      )}

      {editorOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setEditorOpen(false) }}>
        <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
          <div className="modal-header"><div><p className="eyebrow">MOJE KUCHAŘKA</p><h2 id="editor-title">{editingId ? 'Upravit recept' : 'Nový recept'}</h2></div><button className="icon-button" onClick={() => setEditorOpen(false)} disabled={busy} aria-label="Zavřít"><X size={21} /></button></div>
          <form onSubmit={saveRecipe} className="recipe-form">
            <div className="form-grid">
              <label className="field full-field"><span>Název receptu *</span><input autoFocus value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="Např. Jablečný koláč" required /></label>
              <label className="field full-field"><span>Krátký popis</span><textarea rows="2" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} placeholder="Stručný popis receptu..." /></label>
              <label className="field"><span>Náročnost</span><select value={form.difficulty} onChange={e => setForm(v => ({ ...v, difficulty: e.target.value }))}><option>Snadná</option><option>Střední</option><option>Náročná</option></select></label>
              <label className="field"><span>Kategorie</span><select value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))}>{CATEGORIES.slice(2).map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="field"><span>Doba přípravy</span><input value={form.prep_time} onChange={e => setForm(v => ({ ...v, prep_time: e.target.value }))} placeholder="Např. 45 minut" /></label>
              <label className="field"><span>Počet porcí</span><input type="number" min="1" max="100" value={form.servings} onChange={e => setForm(v => ({ ...v, servings: e.target.value }))} /></label>
            </div>
            <div className="form-section-heading"><h3>Fotografie</h3><span>Volitelné · do 10 MB</span></div>
            <div className="photo-upload">
              {form.image ? <div className="photo-empty"><ImagePlus size={24} /><span>Nová fotografie vybrána</span><small>{form.image.name}</small></div> : <div className="photo-empty"><Camera size={25} /><span>{editingId ? 'Ponechat stávající fotografii' : 'Přidejte fotografii jídla'}</span></div>}
              <div className="photo-buttons"><button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}><ImagePlus size={17} /> Vybrat fotografii</button>{form.image && <button type="button" className="text-button danger-text" onClick={() => setForm(v => ({ ...v, image: null }))}>Odebrat výběr</button>}</div>
              <input ref={fileRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file && file.size > 10 * 1024 * 1024) setNotice('Fotografie musí mít maximálně 10 MB.'); else if (file) setForm(v => ({ ...v, image: file })); e.target.value = '' }} />
            </div>
            <div className="form-section-heading"><h3>Suroviny</h3><span>Množství a jednotky</span></div>
            <div className="ingredient-editor">{form.ingredients.map((item, index) => <div className="ingredient-row" key={index}><input aria-label="Surovina" value={item.name} onChange={e => changeIngredient(index, 'name', e.target.value)} placeholder="Např. mouka" /><input aria-label="Množství" value={item.amount} onChange={e => changeIngredient(index, 'amount', e.target.value)} placeholder="Množství" /><input aria-label="Jednotka" value={item.unit} onChange={e => changeIngredient(index, 'unit', e.target.value)} placeholder="g, ml, ks" /><button type="button" className="icon-button remove-row" onClick={() => setForm(v => ({ ...v, ingredients: v.ingredients.length === 1 ? v.ingredients : v.ingredients.filter((_, i) => i !== index) }))} aria-label="Odebrat surovinu"><X size={17} /></button></div>)}<button type="button" className="add-line-button" onClick={() => setForm(v => ({ ...v, ingredients: [...v.ingredients, { name: '', amount: '', unit: '' }] }))}><Plus size={16} /> Přidat surovinu</button></div>
            <div className="form-section-heading"><h3>Postup přípravy</h3><span>Každý krok zvlášť</span></div>
            <div className="steps-editor">{form.steps.map((step, index) => <div className="step-editor-row" key={index}><span className="step-editor-number">{index + 1}</span><textarea rows="2" value={step} onChange={e => changeStep(index, e.target.value)} placeholder={`Popiš ${index + 1}. krok...`} /><button type="button" className="icon-button remove-row" onClick={() => setForm(v => ({ ...v, steps: v.steps.length === 1 ? v.steps : v.steps.filter((_, i) => i !== index) }))} aria-label="Odebrat krok"><X size={17} /></button></div>)}<button type="button" className="add-line-button" onClick={() => setForm(v => ({ ...v, steps: [...v.steps, ''] }))}><Plus size={16} /> Přidat krok</button></div>
            <div className="form-footer"><span className="required-note">* Povinné pole</span><div><button type="button" className="secondary-button" disabled={busy} onClick={() => setEditorOpen(false)}>Zrušit</button><button type="submit" className="primary-button" disabled={busy}><Check size={17} /> {busy ? 'Ukládám…' : 'Uložit recept'}</button></div></div>
          </form>
        </section>
      </div>}

      {shareOpen && selectedRecipe && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setShareOpen(false) }}>
        <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
          <div className="modal-header"><div><p className="eyebrow">SDÍLENÍ RECEPTU</p><h2 id="share-title">Pozvat kamarádku</h2></div><button className="icon-button" onClick={() => setShareOpen(false)} disabled={busy}><X size={21} /></button></div>
          <form className="share-form" onSubmit={inviteByEmail}>
            <p className="muted">Kamarádka musí mít v aplikaci už vytvořený účet se stejnou e-mailovou adresou.</p>
            <label className="field"><span>E-mail uživatelky</span><input type="email" required value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="kamaradka@email.cz" /></label>
            <label className="field"><span>Oprávnění</span><select value={shareRole} onChange={e => setShareRole(e.target.value)}><option value="viewer">Pouze prohlížení</option><option value="editor">Prohlížení a úpravy</option></select></label>
            <div className="share-info"><Users size={17} /><span>Pozvánka se zobrazí kamarádce po přihlášení do její kuchařky.</span></div>
            <div className="form-footer"><span className="required-note">Sdílení lze později zrušit.</span><button className="primary-button" disabled={busy}><Send size={16} /> {busy ? 'Odesílám…' : 'Vytvořit pozvánku'}</button></div>
          </form>
        </section>
      </div>}

      {notice && <div className={`toast ${notice.toLowerCase().includes('nepodař') || notice.toLowerCase().includes('chyba') ? 'toast-error' : ''}`}><Check size={17} />{notice}</div>}
      <footer className="footer"><span>Moje recepty</span><span>Osobní digitální kuchařka</span></footer>
    </div>
  )
}

export default App
