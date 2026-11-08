"""Compile original LoopLab questions; never executes learner/imported code.
Python >=3.12. Trusted generated scripts run with -I -S, 2s timeout,
128 MiB address-space cap (POSIX), and bounded captured output.
"""
from __future__ import annotations
import hashlib
import json
import math
import os
from pathlib import Path
import random
import resource
import subprocess
import sys
from decimal import Decimal, localcontext
from fractions import Fraction

ROOT = Path(__file__).resolve().parents[1]
VERSION = 1
BANDS = {'R1':['Foundation'], 'R2':['Foundation','Exam'], 'R3':['Exam','Transfer'],
 'R4':['Transfer'], 'A1':['Foundation','Exam'], 'A2':['Exam','Transfer'],
 'T1':['Foundation','Exam'], 'T2':['Transfer'], 'P1':['Foundation','Exam'],
 'P2':['Exam'], 'U1':['Foundation','Exam','Transfer'], 'M1':['Foundation','Exam']}
TITLES = dict(zip(BANDS, ['Affine recurrence','Two-term recurrence','Index-dependent recurrence',
 'Three-term recurrence','Filtered polynomial sum','Recurrence prefix sum','Sequence threshold',
 'Prefix-sum threshold','Geometric approximation','Pi-series approximation','Simultaneous updates','Matrix evolution']))

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()

class PRNG:
    """xorshift32-v1, seed zero maps to one; unsigned 32-bit state."""
    def __init__(self, seed): self.state = seed or 1
    def next(self):
        x = self.state
        x ^= (x << 13) & 0xffffffff
        x ^= x >> 17
        x ^= (x << 5) & 0xffffffff
        self.state = x & 0xffffffff
        return self.state
    def integer(self, low, high): return low + self.next() % (high-low+1)


def matrix_mul(a,b):
    return [[sum(x*y for x,y in zip(row,col)) for col in zip(*b)] for row in a]

def matrix_power(a,n):
    result = [[int(i==j) for j in range(len(a))] for i in range(len(a))]
    while n:
        if n & 1: result = matrix_mul(result,a)
        a = matrix_mul(a,a)
        n //= 2
    return result


def high_pi():
    with localcontext() as ctx:
        ctx.prec = 90
        def atan_inv(q):
            x = Decimal(1)/q
            total = Decimal(0)
            for k in range(200): total += (-1 if k%2 else 1)*x**(2*k+1)/(2*k+1)
            return total
        return 16*atan_inv(5)-4*atan_inv(239)
PI = high_pi()


def solve(t,p):
    n,f = p['n'],p['f']
    trace=[]
    def row(k,*v): trace.append([str(k),*[str(x) for x in v]])
    if t=='R1':
        x=p['x']; row(0,x)
        for k in range(n): x=p['a']*x+p['b']; row(k+1,x)
        answer=x if f==0 else (p['a']-1)*x+p['b']
    elif t in ('R2','R3','R4','A2'):
        x,y,z=p['x'],p['y'],p['z']; row(0,x); row(1,y)
        if t=='R4':
            row(2,z)
            for k in range(3,n+1): x,y,z=y,z,p['a']*z+p['b']*y+p['c']*x; row(k,z)
            answer=[p['x'],p['y'],p['z']][n] if n<3 else z
            if f: answer += [p['x'],p['y']][n-1] if n<3 else y
        else:
            total=x+(y if not f else 0) if n else x
            for k in range(2,n+1):
                x,y=y,p['a']*y+p['b']*x+(p['c']*k**(f+1) if t=='R3' else 0)
                if t=='A2' and (not f or k%2==0): total+=y
                row(k,y)
            answer=total if t=='A2' else (p['x'] if n==0 else p['y'] if n==1 else y)
            if t=='R2' and f: answer += p['x'] if n==1 else x
    elif t=='A1':
        total=0; row(-1,total)
        for k in range(n+1):
            if not f or k%p['d']==1: total+=p['a']*k*k+p['b']*k+p['c']
            row(k,total)
        answer=total
    elif t in ('T1','T2'):
        x,y,k=p['x'],p['y'],0; total=x; row(k,total)
        while total < p['target'] if not f else total <= p['target']:
            k+=1
            if t=='T1': x=p['a']*x+p['b']; total=x
            elif k==1: total+=y
            else: x,y=y,x+y; total+=y
            row(k,total)
            if k>5000: raise ValueError('Threshold cap')
        answer=k
    elif t in ('P1','P2'):
        target=p['q']/((p['q']-1)*p['q']**p['s']) if t=='P1' else math.pi
        total=0.0; k=-1; errors=[abs(target)]
        while abs(target-total)>10**(-p['e']):
            k+=1
            term=(1/p['q'])**(k+p['s']) if t=='P1' else (1/16**k)*(4/(8*k+1)-2/(8*k+4)-1/(8*k+5)-1/(8*k+6))
            total+=term; row(k,total,abs(target-total)); errors.append(abs(target-total))
            if k>100: raise ValueError('Series cap')
        epsilon=10**(-p['e']); margin=max(8*math.ulp(target),epsilon*1e-6)
        if any(abs(err-epsilon)<=margin for err in errors[-2:]): raise ValueError('Fragile floating boundary')
        answer=k+f
    elif t=='U1':
        x,y,z=p['x'],p['y'],p['z']; row(0,x,y,*([z] if f else []))
        for k in range(n):
            if f: x,y,z=y+p['a']*z,x-z,x+p['b']*y
            else: x,y=x+p['a']*y,x-p['b']*y
            row(k+1,x,y,*([z] if f else []))
        answer=z if f else x
    elif t=='M1':
        w,x,y,z=1,0,0,1; row(0,w,x,y,z)
        for k in range(n):
            w,x,y,z=w*p['a']+x*p['c'],w*p['b']+x*p['d'],y*p['a']+z*p['c'],y*p['b']+z*p['d']
            row(k+1,w,x,y,z)
        answer=w+z if f else w
    else: raise ValueError(t)
    if len(trace)>7: trace=trace[:4]+[['... omitted ...']]+trace[-2:]
    return answer,trace


def independent(t,p):
    n,f=p['n'],p['f']
    if t=='R1':
        def value(k): return p['x']+k*p['b'] if p['a']==1 else p['a']**k*p['x']+p['b']*(p['a']**k-1)//(p['a']-1)
        return value(n) if not f else value(n+1)-value(n)
    if t in ('R2','R3','R4','A2'):
        terms=[p['x'],p['y']]+([p['z']] if t=='R4' else [])
        for k in range(len(terms),n+1):
            terms.append(p['a']*terms[k-1]+p['b']*terms[k-2]+(p['c']*terms[k-3] if t=='R4' else p['c']*k**(f+1) if t=='R3' else 0))
        if t=='A2': return sum(terms[k] for k in range(n+1) if not f or k%2==0)
        return terms[n]+(terms[n-1] if f and t in ('R2','R4') else 0)
    if t=='A1': return sum(p['a']*k*k+p['b']*k+p['c'] for k in (range(1,n+1,p['d']) if f else range(n+1)))
    if t in ('T1','T2'):
        values=[p['x']]
        if t=='T1':
            for _ in range(5000): values.append(p['a']*values[-1]+p['b'])
        else:
            values.append(p['y'])
            for _ in range(150): values.append(values[-1]+values[-2])
            values=[sum(values[:k+1]) for k in range(len(values))]
        return next(k for k,x in enumerate(values) if x>=p['target'] if not f) if not f else next(k for k,x in enumerate(values) if x>p['target'])
    if t in ('P1','P2'):
        with localcontext() as ctx:
            ctx.prec=90
            target=Decimal(p['q'])/((p['q']-1)*Decimal(p['q'])**p['s']) if t=='P1' else PI
            total=Fraction(0)
            for k in range(100):
                total+=Fraction(1,p['q']**(k+p['s'])) if t=='P1' else Fraction(1,16**k)*(Fraction(4,8*k+1)-Fraction(2,8*k+4)-Fraction(1,8*k+5)-Fraction(1,8*k+6))
                if abs(target-Decimal(total.numerator)/Decimal(total.denominator))<=Decimal(10)**-p['e']: return k+f
        raise ValueError('High precision cap')
    if t=='U1':
        a=[[0,1,p['a']],[1,0,-1],[1,p['b'],0]] if f else [[1,p['a']],[1,-p['b']]]
        v=[[p['x']],[p['y']]]+([[p['z']]] if f else [])
        return matrix_mul(matrix_power(a,n),v)[2 if f else 0][0]
    if t=='M1':
        a=matrix_power([[p['a'],p['b']],[p['c'],p['d']]],n)
        return a[0][0]+(a[1][1] if f else 0)
    raise ValueError(t)


def render(t,p):
    n,f=p['n'],p['f']; headers=['Index','Value']
    hints=['Store only the values needed by the next update.','Use the supplied starting indices; include the final update once.','Compute each new value from the old state before assigning it.']
    check='At update count zero, no updates have occurred.'
    if t=='R1':
        formula=f'x_0={p["x"]},\\quad x_{{k+1}}={p["a"]}x_k+({p["b"]})\\quad(k\\geq0)'
        prompt=f'Find x_{n}.' if not f else f'Find x_{n+1} - x_{n}.'
        code=f'x = {p["x"]}\nfor k in range({n}):\n    x = {p["a"]} * x + ({p["b"]})\nprint('+('x' if not f else f'({p["a"]}-1)*x+({p["b"]})')+')'
    elif t in ('R2','R3','R4','A2'):
        formula=f'u_0={p["x"]},\\ u_1={p["y"]}'+(f',\\ u_2={p["z"]}' if t=='R4' else '')
        extra=f'+({p["c"]})u_{{k-3}}' if t=='R4' else f'+({p["c"]})k'+('^2' if f else '') if t=='R3' else ''
        formula+=f',\\quad u_k={p["a"]}u_{{k-1}}+({p["b"]})u_{{k-2}}{extra}\\quad(k\\geq{3 if t=="R4" else 2})'
        prompt=f'Find u_{n}'+(f' + u_{n-1}.' if f and t in ('R2','R4') else '.')
        if t=='A2': prompt=f'Sum u_k for {"even k only" if f else "all integers k"} from 0 through {n}, including the applicable base terms.'
        if t=='R4':
            code=f'x, y, z = {p["x"]}, {p["y"]}, {p["z"]}\nfor k in range(3, {n+1}):\n    x, y, z = y, z, {p["a"]}*z+({p["b"]})*y+({p["c"]})*x\nprint('+('z + y' if f else 'z')+')'
            if n<3: code=f'print({independent(t,p)})'
        else:
            code=f'x, y = {p["x"]}, {p["y"]}\n'
            if t=='A2': code+=f'total = {p["x"]+(p["y"] if not f and n else 0)}\n'
            code+=f'for k in range(2, {n+1}):\n    x, y = y, {p["a"]}*y+({p["b"]})*x'+(f'+({p["c"]})*k'+('*k' if f else '') if t=='R3' else '')+'\n'
            if t=='A2': code+=('    if k % 2 == 0:\n        total += y\n' if f else '    total += y\n')
            output='total' if t=='A2' else ('y + x' if f and t=='R2' else 'y') if n else str(p['x'])
            code+=f'print({output})'
        check=f'The supplied u_0 is {p["x"]}. A target at index 0 needs no recurrence update.'
    elif t=='A1':
        formula=f'v_k={p["a"]}k^2+({p["b"]})k+({p["c"]})'
        prompt=f'Sum v_k for 0 <= k <= {n}'+(f', including only k with remainder 1 on division by {p["d"]}.' if f else ', including both endpoints.')
        code=f'total = 0\nfor k in range({n+1}):\n'+(f'    if k % {p["d"]} == 1:\n    ' if f else '')+f'    total += {p["a"]}*k*k+({p["b"]})*k+({p["c"]})\nprint(total)'
        hints=['Start an accumulator at zero.','Test the filter before adding a term.','Loop over range(N + 1) to include N.']
    elif t in ('T1','T2'):
        formula=f'x_0={p["x"]},\\ x_{{k+1}}={p["a"]}x_k+{p["b"]}' if t=='T1' else f'u_0={p["x"]},\\ u_1={p["y"]},\\ u_k=u_{{k-1}}+u_{{k-2}}\\ (k\\geq2),\\ S_k=\\sum_{{j=0}}^k u_j'
        prompt=f'Find the smallest k >= 0 such that {"x_k" if t=="T1" else "S_k"} {">" if f else ">="} {p["target"]}. Test index 0 before any update.'
        condition=f'{"<=" if f else "<"} {p["target"]}'
        code=f'x, k = {p["x"]}, 0\nwhile x {condition}:\n    x = {p["a"]}*x+{p["b"]}\n    k += 1\nprint(k)' if t=='T1' else f'x, y = {p["x"]}, {p["y"]}\ntotal, k = x, 0\nwhile total {condition}:\n    k += 1\n    if k == 1:\n        total += y\n    else:\n        x, y = y, x + y\n        total += y\nprint(k)'
        hints=['Compare the initial state first.','Keep the exact strict or inclusive inequality.','Continue while the stopping condition is false; increment the index with the state.']
    elif t in ('P1','P2'):
        formula=f'S_K=\\sum_{{j=0}}^K(1/{p["q"]})^{{j+{p["s"]}}},\\quad L=\\frac{{{p["q"]}}}{{({p["q"]}-1){p["q"]}^{{{p["s"]}}}}' if t=='P1' else r'S_K=\sum_{j=0}^K\frac{1}{16^j}\left(\frac{4}{8j+1}-\frac{2}{8j+4}-\frac{1}{8j+5}-\frac{1}{8j+6}\right),\quad L=\pi'
        prompt=f'Add terms in ascending j from j=0. Stop at the first K with abs(L - S_K) <= 1e-{p["e"]}. Return {"the number of included terms K+1" if f else "the last included index K"}. Use ordinary Python floats, with no intermediate rounding.'
        target=f'{p["q"]} / (({p["q"]}-1)*{p["q"]}**{p["s"]})' if t=='P1' else 'math.pi'
        term=f'(1 / {p["q"]}) ** (k + {p["s"]})' if t=='P1' else '(1 / 16**k)*(4/(8*k+1)-2/(8*k+4)-1/(8*k+5)-1/(8*k+6))'
        code=('import math\n' if t=='P2' else '')+f'target = {target}\ns, k = 0.0, -1\nwhile abs(target - s) > 1e-{p["e"]}:\n    k += 1\n    s += {term}\nprint('+('k + 1' if f else 'k')+')'
        headers=['Last index','Partial sum','Absolute error']
        hints=['The first included term has index zero.','Continue while absolute error is greater than epsilon.','Number of terms is last index plus one.']
    elif t=='U1':
        formula=f'(x,y,z)\\leftarrow(y+{p["a"]}z,\\ x-z,\\ x+{p["b"]}y)' if f else f'(x,y)\\leftarrow(x+{p["a"]}y,\\ x-{p["b"]}y)'
        prompt=f'Initially x={p["x"]}, y={p["y"]}'+(f', z={p["z"]}' if f else '')+f'. Perform exactly {n} simultaneous updates. ALL right-hand sides use the OLD values. Return {"z" if f else "x"}.'
        code=f'x, y'+(', z' if f else '')+f' = {p["x"]}, {p["y"]}'+(f', {p["z"]}' if f else '')+f'\nfor k in range({n}):\n'+(f'    x, y, z = y+{p["a"]}*z, x-z, x+{p["b"]}*y\nprint(z)' if f else f'    x, y = x+{p["a"]}*y, x-{p["b"]}*y\nprint(x)')
        headers=['Updates','x','y']+(['z'] if f else [])
    else:
        formula=f'A=\\begin{{pmatrix}}{p["a"]}&{p["b"]}\\\\{p["c"]}&{p["d"]}\\end{{pmatrix}},\\quad A^0=I'
        prompt=f'Find {"the trace (sum of diagonal entries)" if f else "the top-left entry"} of A^{n}. For B=[[w,x],[y,z]], B A=[[w*a+x*c,w*b+x*d],[y*a+z*c,y*b+z*d]], with A=[[a,b],[c,d]]. Update all four entries using the previous matrix.'
        code=f'a, b, c, d = {p["a"]}, {p["b"]}, {p["c"]}, {p["d"]}\nw, x, y, z = 1, 0, 0, 1\nfor k in range({n}):\n    w, x, y, z = w*a+x*c, w*b+x*d, y*a+z*c, y*b+z*d\nprint('+('w + z' if f else 'w')+')'
        headers=['Power','w','x','y','z']
    return dict(formula=formula,prompt=prompt,python=code+'\n',hints=hints,check=check,traceHeaders=headers,
      explanation='Initial rows precede any update. Later rows show state AFTER the labelled update. Omitted rows are marked. Python tuple assignment evaluates every right-hand side before replacing old values.')


def memory_cap(): resource.setrlimit(resource.RLIMIT_AS,(128*1024*1024,128*1024*1024))
def run_python(code):
    result=subprocess.run([sys.executable,'-I','-S','-c',code],capture_output=True,text=True,timeout=2,preexec_fn=memory_cap if os.name=='posix' else None)
    if result.returncode or len(result.stdout)>256: raise ValueError('Reference execution failed: '+result.stderr[:160])
    return result.stdout.strip()


def make_item(t,p,band,pool):
    answer,trace=solve(t,p)
    if not answer or len(str(abs(answer)))>18: raise ValueError('Zero or overlong output')
    if answer!=independent(t,p): raise ValueError('Independent mismatch')
    rendered=render(t,p)
    if run_python(rendered['python'])!=str(answer): raise ValueError('Displayed Python mismatch')
    if len(rendered['python'].splitlines())>25: raise ValueError('Overlong reference')
    meaningful={k:p[k] for k in ('x','a','b','n')} if t=='R1' else {'e':p['e']} if t=='P2' else {'q':p['q'],'s':p['s'],'e':p['e']} if t=='P1' else dict(p)
    meaningful.pop('f',None)
    group=digest([t,meaningful])
    identity=digest([VERSION,t,p,band])
    item=dict(id=t+'-'+identity[:20],template=t,band=band,form=str(p['f']),pool=pool,
      parameters={k:str(v) for k,v in p.items()},expected=str(answer),trace=trace,
      group=group,fingerprint=digest([t,p]),parameterSetId=identity,
      versions=dict(template=1,renderer=1,grading=1,prng=1),
      structure=dict(stateWidth=4 if t=='M1' else 3 if t in ('R4','A2','T2') or t=='U1' and p['f'] else 2,
       stopKind='tolerance' if t.startswith('P') else 'threshold' if t.startswith('T') else 'fixed',
       formulaKind=t,indexConvention='zero-based',accumulatorCount=int(t.startswith('A') or t in ('T2','P1','P2')),scaffoldLevel=band),
      provenance=dict(author='LoopLab original templates',review='independently-verified',manifestVersion=1),**rendered)
    item['contentHash']=digest(item)
    return item


def candidate(rng,t):
    r=rng.integer
    p=dict(x=r(-5,5),y=r(-5,5),z=r(-5,5),a=r(-3,3),b=r(-3,3),c=r(-3,3),d=r(2,5),n=r(5,22),q=r(2,9),s=r(0,3),e=r(5,12),target=r(50,3000),f=0)
    if t in ('T1','T2'): p.update(x=r(1,5),y=r(2,5),a=r(1,3),b=r(1,5))
    if t=='R1' and p['a'] in (-1,0): p['a']=2
    return p


def build():
    output=ROOT/'public'/'catalogue'; output.mkdir(parents=True,exist_ok=True)
    manifest=dict(version=VERSION,seed=143217,prng='xorshift32-v1',templates={},total=0,
     verification=dict(independent=True,displayedPythonExecuted=True,timeoutSeconds=2,memoryLimitMiB=128,exactIntegerTransport='decimal strings'),
     limitations=['P2 has only two heldout tolerance groups.','Numerical answers do not establish Python proficiency.','Browser-engine parity is verified separately by Playwright.'])
    rng=PRNG(143217)
    for t in BANDS:
        items=[]; seen=set(); rejected=0
        if t=='P2':
            for e in range(5,15):
                for f in (0,1):
                    p=candidate(rng,t); p.update(e=e,f=f)
                    try: items.append(make_item(t,p,'Exam','heldout' if e in (8,12) else 'practice'))
                    except ValueError: rejected+=1
        else:
            groups=0
            while groups<125:
                p=candidate(rng,t); key=digest({k:v for k,v in p.items() if k!='f'})
                if key in seen: continue
                seen.add(key); pool='practice' if groups<100 else 'heldout'
                band=BANDS[t][groups%len(BANDS[t])]
                pair=[]
                try:
                    for f in (0,1):
                        p['f']=f
                        b=('Transfer' if f else ('Foundation' if groups%2 else 'Exam')) if t=='U1' else band
                        pair.append(make_item(t,p,b,pool))
                except (ValueError,StopIteration,OverflowError): rejected+=1; continue
                items.extend(pair); groups+=1
        data=json.dumps(items,separators=(',',':'),ensure_ascii=False).encode()
        (output/(t+'.json')).write_bytes(data)
        manifest['templates'][t]=dict(file=t+'.json',sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),count=len(items),rejected=rejected,bands=BANDS[t],title=TITLES[t])
        manifest['total']+=len(items)
        print(t,len(items),'approved;',rejected,'rejected',flush=True)
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Approved total:',manifest['total'])

if __name__=='__main__': build()
