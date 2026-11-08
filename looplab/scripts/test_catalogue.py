import unittest
from build_catalogue import PRNG, candidate, solve, independent, render, run_python, BANDS

class CompilerTests(unittest.TestCase):
    def test_prng_vectors(self):
        r=PRNG(1)
        self.assertEqual([r.next() for _ in range(5)],[270369,67634689,2647435461,307599695,2398689233])
    def test_extra_deterministic_draws(self):
        r=PRNG(905)
        for t in BANDS:
            if t=='P2': continue
            accepted=0
            for k in range(1000):
                p=candidate(r,t); p['f']=k%2
                try: actual,_=solve(t,p)
                except (ValueError,OverflowError): continue
                self.assertEqual(actual,independent(t,p),(t,p)); accepted+=1
            self.assertGreater(accepted,100)
    def test_bases_and_no_update(self):
        r=PRNG(2)
        for t in ['R1','R2','R3','A2','U1','M1']:
            for n in (0,1):
                p=candidate(r,t); p.update(n=n,f=0)
                answer,_=solve(t,p)
                self.assertEqual(answer,independent(t,p))
                self.assertEqual(str(answer),run_python(render(t,p)['python']))
    def test_exact_threshold_boundary(self):
        p=candidate(PRNG(4),'T1');p.update(x=3,a=1,b=2,target=3,f=0)
        self.assertEqual(solve('T1',p)[0],0)
        p['f']=1
        self.assertEqual(solve('T1',p)[0],1)
    def test_approximations_all_tolerances(self):
        for t in ['P1','P2']:
            for e in range(5,15):
                for f in (0,1):
                    p=candidate(PRNG(8),t);p.update(e=e,f=f)
                    try: actual,_=solve(t,p)
                    except ValueError: continue
                    self.assertEqual(actual,independent(t,p))
                    self.assertEqual(str(actual),run_python(render(t,p)['python']))

if __name__=='__main__': unittest.main()
